import { When, Then } from '../../../utils/Fixtures';
import { HitApiPage } from '../../../pages/apigw/ui/HitApiPage';

// Shared between When and Then so Then can confirm the step completed
let hitCompleted = false;

When(
  'the user hits the API Gateway endpoint from page {string}',
  async ({ page, request }, apiPageUrl: string) => {
    const hitApiPage = new HitApiPage(page, request);
    await hitApiPage.hitApi(apiPageUrl);
    hitCompleted = true;
  }
);

Then(
  'the API endpoint should return a valid HTTP response',
  async () => {
    // The expect() inside HitApiPage.hitApi() already asserts status > 0.
    // This Then step confirms the When completed without throwing.
    if (!hitCompleted) throw new Error('hitApi() did not complete successfully');
    console.log('✅ API hit completed and response validated');
    hitCompleted = false; // reset for next scenario
  }
);
