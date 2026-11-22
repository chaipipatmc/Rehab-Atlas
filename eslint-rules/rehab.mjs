/**
 * Local ESLint rules for Rehab-Atlas.
 *
 * Each rule encodes a mistake that happened before (see eslint.config.mjs for
 * the full map). Error messages say how to fix the root cause, so an agent
 * reading the lint output does not need to find a prose rule somewhere else.
 */

const SECRET_NAME = /(secret|token|passw(or)?d|api[_-]?key|authorization|cookie|credential|private[_-]?key|service[_-]?role)/i;
// Names that merely mention tokens but hold no secret (Claude usage counters etc.).
const NOT_SECRET_NAME = /(count|length|usage|used|max|limit|budget|estimate|input|output|total|expires|ttl|type|name|url|kind|label|cache)/i;
const SECRET_ENV_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|_KEY|KEY_|SERVICE_ROLE|CREDENTIAL)/;
const COMPARE_NAME = /(secret|signature|hmac|digest|webhookkey|expectedsig|apikey|api_key)/i;

function isProcessEnv(node) {
  return (
    node &&
    node.type === "MemberExpression" &&
    node.object.type === "MemberExpression" &&
    node.object.object.type === "Identifier" &&
    node.object.object.name === "process" &&
    !node.object.computed &&
    node.object.property.type === "Identifier" &&
    node.object.property.name === "env"
  );
}

function envName(node) {
  if (!isProcessEnv(node)) return null;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  if (node.property.type === "Literal" && typeof node.property.value === "string") return node.property.value;
  return null;
}

function nameOf(node) {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") return node.property.name;
  return null;
}

function isSecretName(name) {
  return !!name && SECRET_NAME.test(name) && !NOT_SECRET_NAME.test(name);
}

/** `<x>.text()` / `<x>.json()` where x is not the incoming request. */
function isBodyRead(node) {
  if (!node) return false;
  if (node.type === "AwaitExpression") return isBodyRead(node.argument);
  if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
    const method = nameOf(node.callee);
    if (method === "catch" || method === "then") return isBodyRead(node.callee.object);
    if (method === "slice" || method === "substring") return isBodyRead(node.callee.object);
    if (method === "text" || method === "json") {
      const target = nameOf(node.callee.object);
      return !(target && /^(req|request)$/i.test(target));
    }
  }
  if (node.type === "ChainExpression") return isBodyRead(node.expression);
  return false;
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.set.get(name);
    if (v) return v;
  }
  return null;
}

function walk(node, visit, parentKey) {
  if (!node || typeof node.type !== "string") return;
  if (visit(node, parentKey) === false) return;
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => walk(c, visit, key));
    else if (child && typeof child.type === "string") walk(child, visit, key);
  }
}

const noSecretInLogs = {
  meta: {
    type: "problem",
    docs: { description: "Never log env values, tokens/secrets or raw HTTP response bodies." },
    schema: [],
    messages: {
      env: "Do not log process.env values. Log only whether a setting is configured (e.g. `Boolean(process.env.X)`).",
      secret:
        "Do not log '{{name}}' — it looks like a secret/token. Log a non-secret fact instead (configured: yes/no, length, HTTP status).",
      body:
        "Do not log a raw HTTP response body (it can echo tokens or request data — the Gmail invalid_grant incident). Log `await summarizeHttpError(res)` from @/lib/http-error instead.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          callee.object.type !== "Identifier" ||
          callee.object.name !== "console"
        ) {
          return;
        }
        const scope = sourceCode.getScope(node);
        for (const arg of node.arguments) {
          walk(arg, (n, key) => {
            // Skip property keys in object literals ({ token: ... } key is fine; the value is checked).
            if (key === "key") return;
            if (n.type === "CallExpression" && nameOf(n.callee) === "Boolean") return false;
            if (n.type === "UnaryExpression" && n.operator === "!") return false;
            if (isProcessEnv(n)) {
              context.report({ node: n, messageId: "env" });
              return false;
            }
            if (isBodyRead(n)) {
              context.report({ node: n, messageId: "body" });
              return false;
            }
            if (n.type === "MemberExpression") {
              if (!n.computed && isSecretName(nameOf(n)) && !(n.parent && n.parent.type === "CallExpression" && n.parent.callee === n)) {
                context.report({ node: n, messageId: "secret", data: { name: nameOf(n) } });
                return false;
              }
              return;
            }
            // `x.status` / `x.id`: only the member name matters, not the object.
            if (n.type === "Identifier" && key !== "property" && key !== "callee" && key !== "object") {
              if (isSecretName(n.name)) {
                context.report({ node: n, messageId: "secret", data: { name: n.name } });
                return;
              }
              // `data.id` is fine; logging the whole parsed/raw body is not.
              const v = findVariable(scope, n.name);
              const def = v && v.defs[0];
              if (def && def.node.type === "VariableDeclarator" && isBodyRead(def.node.init)) {
                context.report({ node: n, messageId: "body" });
              }
            }
          });
        }
      },
    };
  },
};

function isNullish(node) {
  return (
    (node.type === "Literal") ||
    (node.type === "Identifier" && node.name === "undefined") ||
    (node.type === "UnaryExpression" && node.operator === "typeof") ||
    (node.type === "TemplateLiteral" && node.expressions.length === 0)
  );
}

const timingSafeSecretCompare = {
  meta: {
    type: "problem",
    docs: { description: "Compare secrets/signatures only with safeEqual() (trimmed, constant-time)." },
    schema: [],
    messages: {
      compare:
        "Do not compare secrets/signatures with '{{op}}'. Use verifyCronSecret()/verifyWebhookSecret() (@/lib/agents/base) or readSecretEnv() + safeEqual() (@/lib/secrets): they trim env values (pasted secrets carry a trailing newline) and compare in constant time.",
    },
  },
  create(context) {
    function suspicious(n) {
      if (envName(n) && SECRET_ENV_NAME.test(envName(n))) return true;
      const name = nameOf(n);
      if (name && COMPARE_NAME.test(name)) return true;
      if (n.type === "TemplateLiteral") return n.expressions.some((e) => envName(e) && SECRET_ENV_NAME.test(envName(e)));
      if (
        n.type === "CallExpression" &&
        n.callee.type === "MemberExpression" &&
        nameOf(n.callee) === "get" &&
        n.arguments[0] &&
        n.arguments[0].type === "Literal" &&
        /^(authorization|x-webhook-secret|x-pandadoc-signature)$/i.test(String(n.arguments[0].value))
      ) {
        return true;
      }
      return false;
    }
    return {
      BinaryExpression(node) {
        if (!["===", "!==", "==", "!="].includes(node.operator)) return;
        if (isNullish(node.left) || isNullish(node.right)) return;
        if (suspicious(node.left) || suspicious(node.right)) {
          context.report({ node, messageId: "compare", data: { op: node.operator } });
        }
      },
    };
  },
};

const noAdminClientInClientComponent = {
  meta: {
    type: "problem",
    docs: { description: "The service-role Supabase client must never be bundled into browser code." },
    schema: [],
    messages: {
      admin:
        "'use client' files must not import the service-role client ({{source}}). Move the write behind an API route under src/app/api/ (leads, centers, content all go through server routes) and call it with fetch.",
    },
  },
  create(context) {
    const body = context.sourceCode.ast.body;
    const isClient = body.some(
      (s) => s.type === "ExpressionStatement" && s.directive === "use client"
    );
    if (!isClient) return {};
    function check(node, source) {
      if (typeof source === "string" && /(^|\/)supabase\/admin$/.test(source)) {
        context.report({ node, messageId: "admin", data: { source } });
      }
    }
    return {
      ImportDeclaration(node) {
        check(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal") check(node, node.source.value);
      },
    };
  },
};

const plugin = {
  meta: { name: "eslint-plugin-rehab" },
  rules: {
    "no-secret-in-logs": noSecretInLogs,
    "timing-safe-secret-compare": timingSafeSecretCompare,
    "no-admin-client-in-client-component": noAdminClientInClientComponent,
  },
};

export default plugin;
