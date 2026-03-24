import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">
            Analytics dashboard will be available once Google Analytics and Meta
            Pixel are integrated. Key metrics will include traffic, assessments
            completed, leads generated, and conversion rates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
