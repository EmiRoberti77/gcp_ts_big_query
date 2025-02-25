// Data Clean Room (DCR) with Secure Multi-Party Computation (MPC) in TypeScript
// ------------------------------------------------------
// This project consists of:
// - Service A (Advertiser) uploading data to BigQuery
// - Service B (Media Platform) uploading data to BigQuery
// - Aggregator service securely computing insights
// - MPC enforced to ensure data privacy
// - GCP resources for BigQuery and IAM access control

import { BigQuery } from '@google-cloud/bigquery';
import { IAM } from '@google-cloud/iam';
import { Compute } from '@google-cloud/compute';
import crypto from 'crypto';
import \* as dotenv from 'dotenv';

dotenv.config();
const bigquery = new BigQuery();
const iam = new IAM();
const compute = new Compute();

// ----------------------------
// GCP Setup: Create BigQuery Dataset and Tables
// ----------------------------
async function setupBigQuery() {
await bigquery.dataset('dcrdataset').create({ location: 'US' });
await bigquery.dataset('dcrdataset').table('advertiser_data').create({
schema: [
{ name: 'user_id', type: 'STRING' },
{ name: 'campaign_id', type: 'STRING' },
{ name: 'engagement_score', type: 'INTEGER' },
{ name: 'timestamp', type: 'TIMESTAMP' }
]
});
await bigquery.dataset('dcrdataset').table('media_platform_data').create({
schema: [
{ name: 'user_id', type: 'STRING' },
{ name: 'content_id', type: 'STRING' },
{ name: 'view_duration', type: 'INTEGER' },
{ name: 'timestamp', type: 'TIMESTAMP' }
]
});
console.log('BigQuery dataset and tables set up.');
}

// ----------------------------
// GCP IAM Setup: Restrict Access to BigQuery Data
// ----------------------------
async function setIAMPolicy() {
const policy = {
bindings: [
{
role: 'roles/bigquery.dataViewer',
members: ['user:approved-user@example.com']
},
{
role: 'roles/bigquery.dataEditor',
members: ['serviceAccount:secure-aggregator@my-project-id.iam.gserviceaccount.com']
}
]
};
await iam.setIamPolicy('projects/my-project-id', policy);
console.log('IAM policy updated for secure access.');
}

// ----------------------------
// Service A: Advertiser Data Upload
// ----------------------------
async function uploadAdvertiserData() {
const datasetId = 'dcrdataset';
const tableId = 'advertiser_data';
const rows = [
{
user_id: hashUser('user1@example.com'),
campaign_id: 'campaign_123',
engagement_score: 80,
timestamp: new Date().toISOString()
},
{
user_id: hashUser('user2@example.com'),
campaign_id: 'campaign_456',
engagement_score: 95,
timestamp: new Date().toISOString()
}
];
await bigquery.dataset(datasetId).table(tableId).insert(rows);
console.log(`Advertiser data uploaded.`);
}

// ----------------------------
// Service B: Media Platform Data Upload
// ----------------------------
async function uploadMediaPlatformData() {
const datasetId = 'dcrdataset';
const tableId = 'media_platform_data';
const rows = [
{
user_id: hashUser('user1@example.com'),
content_id: 'content_001',
view_duration: 300,
timestamp: new Date().toISOString()
},
{
user_id: hashUser('user2@example.com'),
content_id: 'content_002',
view_duration: 250,
timestamp: new Date().toISOString()
}
];
await bigquery.dataset(datasetId).table(tableId).insert(rows);
console.log(`Media platform data uploaded.`);
}

// ----------------------------
// Aggregator: Secure Data Computation with MPC
// ----------------------------
async function computeSecureStats() {
const query = `
        SELECT 
            COUNT(DISTINCT user_id) AS unique_users,
            ROUND(AVG(engagement_score) + RAND()*5, 2) AS noisy_avg_engagement,
            ROUND(AVG(view_duration) + RAND()*5, 2) AS noisy_avg_watch_time
        FROM \`data-clean-rooms.dcrdataset.dcr*view\`
WHERE (SELECT COUNT(*) FROM \`data-clean-rooms.dcrdataset.advertiser*data\`) > 10
AND (SELECT COUNT(*) FROM \`data-clean-rooms.dcrdataset.media_platform_data\`) > 10
`;

    const [rows] = await bigquery.query(query);
    console.log(`Secure Aggregated Stats:`, rows);

}

// ----------------------------
// Utility: Hash User Identifiers
// ----------------------------
function hashUser(userId: string): string {
return crypto.createHash('sha256').update(userId).digest('hex');
}

// ----------------------------
// Run the full workflow
// ----------------------------
async function main() {
await setupBigQuery();
await setIAMPolicy();
await uploadAdvertiserData();
await uploadMediaPlatformData();
await computeSecureStats();
}

main().catch(console.error);

(base) user@computer-2 gcp_ts_big_query % export GOOGLE_APPLICATION_CREDENTIALS=data-clean-rooms-key.json

(base) user@computer-2 gcp_ts_big_query % echo $GOOGLE_APPLICATION_CREDENTIALS
data-clean-rooms-key.json
(base) user@computer-2 gcp_ts_big_query % gcloud auth list
Credentialed Accounts
ACTIVE ACCOUNT

-       emi@odincloud.ai

To set the active account, run:
$ gcloud config set account `ACCOUNT`

(base) user@computer-2 gcp_ts_big_query % gcloud auth application-default print-access-token
ya29.c.c0ASRK0GaO-qgOAPYbys9VLQEWhrB512ydi4Mpacqo8wBaOvpyXJ0V4nBS8IM3b2b-AOrwzzkX_pb4GB5piWNgW3aCJifzQqeBBNyDv77jU3qVA7PXh5-CwfrzFqDxnuvqrujGOUfzDCSndhy80Q-HrzYKxKyTxu0Pk5FBy6BI6o8kB4EE0IRZlNqXYB35lg-qvckcqPlQBSewmSm2RC_DZdbM_QI7kgDaFyQFUtHddJfWNC5x8AFhsXWn3N-oeZNil629mV5B9m6_iHSe4-XFDBcRLVzxUQCXaFdIkrTMy83ay9KUTCXjT_ZSAlnP-ygBbeF5kT-cyojcQmlioNNFqiqg0mICQCY78CGFgVBmQ_XeVUJVrKX6tgfo6QN387CdJ9-pSn2BYwIIx6dgmy1Bdd0kYlfe_7ocb4iU4p9SQ9FgpBZ0ObXyhccywYtoS2vYFJiupQz9kBUSpo30-kmbak-hmiyhF7SW7d-kzfXdn7dtdd47-43Jrqr_8rV-FqcVU8XgamqFfZ7BMbno9k_xUFh781v1s_J2Ui5o87i_w2n5JBqu09jFlXlUBBalvIQIxJgikgdXnjUc4vZc81XcUldXY8I9jbxoucJlkR_g6xkkfJ7Zq4BQcw8r77hfI0um12hBptBOd-JO0SdmX5nrs6SzVhkd00adXeZw4hUzYaXsc62S_ZiaMhQIqZ6MMR_BxfuXf0s778zb_ZlZ2J2r3YpxZqlmue2M8nRz3tlFJhqtukBQw0OWdu7tOzjar0tewqqe7zVajtwIsn18y0Ofk2z5cOt-lltqtwsgws2zMg--x5fZiyxZ38ZxkF00Q3dxXWmOzg3VrXw40pylrVmgut-43Iqk43bpqmcflhn6vwezOZmJVSv14dqyQ\_\_7g089Mc7XWrzW7RJ6z0V42JxgMiO97-BhZpvbXbiuzinBVWpV4Io3yOapnYiel7BnroifdRyQ0zmXm_Zyb1rjpRMXXYbU6bi3wQJXgcl7y595S8wkh-rIde-z5iv
(base) user@computer-2 gcp_ts_big_query % ts-node src/index.ts

update service account --

gcloud projects add-iam-policy-binding data-clean-rooms \
 --member="serviceAccount:emidcr@data-clean-rooms.iam.gserviceaccount.com" \
 --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding data-clean-rooms \
 --member="serviceAccount:emidcr@data-clean-rooms.iam.gserviceaccount.com" \
 --role="roles/compute.instanceAdmin"

verify the account -

base) user@Users-MacBook-Pro gcp_ts_big_query % gcloud projects get-iam-policy data-clean-rooms --flatten="bindings[].members" --format="table(bindings.role, bindings.members)" | grep "serviceAccount:emidcr"

roles/bigquery.admin serviceAccount:emidcr@data-clean-rooms.iam.gserviceaccount.com
roles/compute.admin serviceAccount:emidcr@data-clean-rooms.iam.gserviceaccount.com
roles/compute.instanceAdmin serviceAccount:emidcr@data-clean-rooms.iam.gserviceaccount.com
roles/iam.serviceAccountUser serviceAccount:emidcr@data-clean-rooms.iam.gserviceaccount.com
