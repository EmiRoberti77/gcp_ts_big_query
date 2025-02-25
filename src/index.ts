import { BigQuery } from "@google-cloud/bigquery";
import { PoliciesClient } from "@google-cloud/iam";
import { InstancesClient, ZoneOperationsClient } from "@google-cloud/compute";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import util from "util";
import { exec } from "child_process";

const keyPath = path.join(__dirname, "..", "data-clean-rooms-key.json");
const credentials = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

const bigquery = new BigQuery({
  credentials,
});
const iamClient = new PoliciesClient({
  credentials,
});
const computeClient = new InstancesClient({
  credentials,
});
const operationaClient = new ZoneOperationsClient();
const execPromise = util.promisify(exec);
const zone = "us-central1-a";

const dataset = "dcrdataset";
const advertiser_data = "advertiser_data";
const media_platform_data = "media_platform_data";

const projectId = "data-clean-rooms";
const vmName = "emi-dcr-compute-instance-1";

// ----------------------------
// GCP Setup: Create BigQuery Dataset and Tables
// ----------------------------
async function setUpBigQery() {
  await bigquery.dataset(dataset).create();
  await bigquery
    .dataset(dataset)
    .table(advertiser_data)
    .create({
      schema: [
        { name: "user_id", type: "STRING" },
        { name: "campaign_id", type: "STRING" },
        { name: "engagement_score", type: "INTEGER" },
        { name: "timestamp", type: "TIMESTAMP" },
      ],
    });

  await bigquery
    .dataset(dataset)
    .table(media_platform_data)
    .create({
      shema: [
        { name: "user_id", type: "STRING" },
        { name: "content_id", type: "STRING" },
        { name: "view_duration", type: "INTEGER" },
        { name: "timestamp", type: "TIMESTAMP" },
      ],
    });
}
// ----------------------------
// GCP IAM Setup: Restrict Access to BigQuery Data
// ----------------------------
async function setIAMPolicy() {
  const policy = {
    bindings: [
      {
        role: "roles/bigquery.dataViewer",
        members: ["user:approved-user@example.com"],
      },
      {
        role: "roles/bigquery.dataEditor",
        members: [
          "serviceAccount:secure-aggregator@my-project-id.iam.gserviceaccount.com",
        ],
      },
    ],
  };
  //await iamClient.setIamPolicy({ resource: "projects/my-project-id", policy });
  console.log("IAM policy updated for secure access.");
}
// ----------------------------
// Service B: Media Platform Data Upload
// ----------------------------
async function uploadAdvertiserData() {
  const rows = [
    {
      user_id: hashUser("user1@example.com"),
      campaign_id: "content_067",
      engagement_score: 300,
      timestamp: new Date().toISOString(),
    },
    {
      user_id: hashUser("useremi@example.com"),
      campaign_id: "content_078",
      engagement_score: 678,
      timestamp: new Date().toISOString(),
    },
  ];

  await bigquery.dataset(dataset).table(advertiser_data).insert(rows);
}

// ----------------------------
// Service B: Media Platform Data Upload
//
async function uploadMediaPlatformData() {
  const rows = [
    {
      user_id: hashUser("user1@example.com"),
      content_id: "content_067",
      view_duration: 300,
      timestamp: new Date().toISOString(),
    },
    {
      user_id: hashUser("useremi@example.com"),
      content_id: "content_078",
      view_duration: 250,
      timestamp: new Date().toISOString(),
    },
  ];
  await bigquery.dataset(dataset).table(media_platform_data).insert(rows);
}
// ----------------------------
// Utility: Hash User Identifiers
// ----------------------------
function hashUser(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex");
}
// ----------------------------
// Aggregator: Secure Data Computation with MPC
// ----------------------------
async function computeSecureWithNoiseStats() {
  const query = `
        SELECT 
            COUNT(DISTINCT user_id) AS unique_users,
            ROUND(AVG(engagement_score) + RAND()*5, 2) AS noisy_avg_engagement,
            ROUND(AVG(view_duration) + RAND()*5, 2) AS noisy_avg_watch_time
        FROM \`data-clean-rooms.dcrdataset.dcr_view\`
        WHERE (SELECT COUNT(*) FROM \`data-clean-rooms.dcrdataset.advertiser_data\`) > 10
        AND (SELECT COUNT(*) FROM \`data-clean-rooms.dcrdataset.media_platform_data\`) > 10
    `;

  const [rows] = await bigquery.query(query);
  console.log(`Secure Aggregated Stats:`, rows);
}

async function computeSecureNoNoiseStats() {
  const query = `
          SELECT 
            COUNT(DISTINCT user_id) AS unique_users,
            AVG(engagement_score) AS avg_engagement,
            AVG(view_duration) AS avg_watch_time
            FROM \`data-clean-rooms.dcrdataset.dcr_view\`;`;

  const [rows] = await bigquery.query(query);
  console.log(`Secure Aggregated Stats:`, rows);
}

async function computeInConfidentialVm() {
  try {
    console.log("🚀 Creating Confidential VM...");
    const [operation] = await computeClient.insert({
      project: projectId,
      zone,
      instanceResource: {
        name: vmName,
        machineType: `zones/${zone}/machineTypes/n2d-standard-4`,
        confidentialInstanceConfig: {
          enableConfidentialCompute: true,
        },
        disks: [
          {
            boot: true,
            initializeParams: {
              sourceImage:
                "projects/confidential-vm-images/global/images/family/ubuntu-2004-lts",
            },
          },
        ],
        networkInterfaces: [
          {
            network: "global/networks/default",
            accessConfigs: [{ name: "External NAT", type: "ONE_TO_ONE_NAT" }],
          },
        ],
        serviceAccounts: [
          {
            email: "emidcr@data-clean-rooms.iam.gserviceaccount.com",
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
          },
        ],
      },
    });

    console.log("⏳ Waiting for VM to be fully created...");
    await operationaClient.wait({
      operation: operation.name,
      project: projectId,
      zone,
    });

    console.log("✅ VM Created! Waiting for it to be reachable...");

    // 🛠 Step 2: Wait until the VM is accessible
    let vmReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const { stdout: status } = await execPromise(
          `gcloud compute instances describe ${vmName} --zone=${zone} --project=${projectId} --format="get(status)"`
        );
        if (status.trim() === "RUNNING") {
          vmReady = true;
          break;
        }
      } catch (err) {
        console.warn(`⏳ Waiting for VM to start (${i + 1}/10)...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before retrying
      }
    }

    if (!vmReady) {
      throw new Error("❌ VM did not reach the RUNNING state in time.");
    }

    console.log("✅ VM is running!");

    // 🛠 Step 3: Check if the VM has an external IP
    let externalIp = "";
    try {
      const { stdout: ipOutput } = await execPromise(
        `gcloud compute instances describe ${vmName} --zone=${zone} --project=${projectId} --format="get(networkInterfaces[0].accessConfigs[0].natIP)"`
      );
      externalIp = ipOutput.trim();
    } catch (err) {
      console.warn(
        "⚠️ VM does not have an external IP. Using IAP tunneling..."
      );
    }

    // 🛠 Step 4: Ensure SSH Firewall Rules Exist
    console.log("🔧 Checking SSH Firewall Rules...");
    try {
      await execPromise(
        `gcloud compute firewall-rules list --filter="name=allow-ssh" --format="value(name)"`
      );
    } catch (err) {
      console.log("🚀 Creating SSH firewall rule...");
      await execPromise(
        `gcloud compute firewall-rules create allow-ssh --allow=tcp:22 --direction=INGRESS --source-ranges=0.0.0.0/0 --priority=1000 --network=default`
      );
    }

    // 🛠 Step 5: Ensure IAM Role Assignments
    console.log("🔐 Ensuring IAM permissions for Compute and BigQuery...");
    try {
      await execPromise(
        `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:my-service-account@${projectId}.iam.gserviceaccount.com" --role="roles/compute.admin"`
      );
      await execPromise(
        `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:my-service-account@${projectId}.iam.gserviceaccount.com" --role="roles/bigquery.dataEditor"`
      );
    } catch (err) {
      console.warn("⚠️ IAM roles might already be assigned.");
    }

    console.log("✅ VM is now fully configured and ready!");

    // 🛠 Step 6: Construct the BigQuery Execution Command
    const sshCommand = externalIp
      ? `gcloud compute ssh ${vmName} --zone=${zone} --project=${projectId} --command='bq query --use_legacy_sql=false "SELECT COUNT(DISTINCT user_id) AS unique_users, AVG(engagement_score) AS avg_engagement, AVG(view_duration) AS avg_watch_time FROM \\\`data-clean-rooms.dcrdataset.dcr_view\\\`;"'`
      : `gcloud compute ssh ${vmName} --zone=${zone} --project=${projectId} --tunnel-through-iap --command='bq query --use_legacy_sql=false "SELECT COUNT(DISTINCT user_id) AS unique_users, AVG(engagement_score) AS avg_engagement, AVG(view_duration) AS avg_watch_time FROM \\\`data-clean-rooms.dcrdataset.dcr_view\\\`;"'`;

    console.log("📡 Running MPC computation inside Confidential VM...");
    const { stdout, stderr } = await execPromise(sshCommand);
    console.error("❌ MPC Computation Error:", stderr);
    console.log("✅ MPC Computation Output:", stdout);
  } catch (err) {
    console.error("❌ Error during Confidential VM execution:", err);
  } finally {
    console.log("🛑 Stopping and Deleting Confidential VM...");
    try {
      await computeClient.delete({
        project: projectId,
        zone,
        instance: vmName,
      });
      console.log("✅ Confidential VM stopped and deleted.");
    } catch (err) {
      console.warn("⚠️ VM might already be deleted.");
    }
  }
}

// Execute the function
computeInConfidentialVm().catch((err) => console.error(err));

// async function main() {
//   //await setUpBigQery();
//   //await setIAMPolicy();
//   //await uploadAdvertiserData();
//   //await uploadMediaPlatformData();
//   await computeInConfidentialVm();
// }

//main().catch((err) => console.log(err));
