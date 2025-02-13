# BigQuery Setup & TypeScript Integration

This project demonstrates how to:

1. **Set up Google BigQuery** using the CLI.
2. **Generate 500 test users** using `faker`.
3. **Insert and query data from BigQuery** using TypeScript.

---

## **🚀 Prerequisites**

- A **Google Cloud Platform (GCP)** account.
- Installed **Google Cloud SDK (gcloud CLI)** ([Install Here](https://cloud.google.com/sdk/docs/install)).
- Installed **Node.js (LTS version)** and `npm`.
- A **Google Cloud service account JSON key** for authentication.

---

## **1️⃣ Setup BigQuery on GCP**

### **🔹 Step 1: Configure Your GCP Project**

```sh
gcloud config get-value project  # Get the current project ID
gcloud auth login  # Authenticate your GCP account
gcloud config set project [PROJECT_ID]  # Replace with your actual GCP project ID
```

### **🔹 Step 2: Enable BigQuery API**

```sh
gcloud services enable bigquery.googleapis.com
```

### **🔹 Step 3: Create a Dataset in BigQuery**

```sh
gcloud alpha bq datasets create emidataset
```

### **🔹 Step 4: Create a Table with Schema**

```sh
bq mk --table emidataset.users id:STRING,name:STRING,age:INTEGER,email:STRING,salary:INTEGER
```

---

## **2️⃣ Install Dependencies**

```sh
npm install @google-cloud/bigquery @faker-js/faker dotenv fs path
```

---

## **3️⃣ Create & Insert Test Data in TypeScript**

### **🔹 TypeScript Code (index.ts)**

```typescript
import { BigQuery } from "@google-cloud/bigquery";
import { faker } from "@faker-js/faker";
import path from "path";
import fs from "fs";

interface User {
  id: string;
  name: string;
  age: number;
  email: string;
  salary: number;
}

const datasetId = "emidataset";
const tableId = "users";
const SELECT_FROM_USERS = "SELECT * FROM emidataset.users LIMIT 20";
const USERS_COUNT = 500;

const keyPath = path.join(__dirname, "..", "bq-key.json");
const credentials = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
const bigquery = new BigQuery({ credentials });

async function createUsers(dataLength: number): Promise<User[]> {
  const users: User[] = [];
  for (let i = 0; i < dataLength; i++) {
    users.push({
      id: i.toString(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 18, max: 100 }),
      email: faker.internet.email(),
      salary: faker.number.int({ min: 4000, max: 15000 }),
    });
  }
  console.log(`Created ${dataLength} test users.`);
  return users;
}

async function insert(): Promise<boolean> {
  const dataset = bigquery.dataset(datasetId);
  const table = dataset.table(tableId);
  const users = await createUsers(USERS_COUNT);
  try {
    await table.insert(users);
    console.log("Data inserted successfully!");
    return true;
  } catch (err) {
    console.error("Insert error:", err);
    return false;
  }
}

async function select(): Promise<User[]> {
  const [rows] = await bigquery.query({ query: SELECT_FROM_USERS });
  return rows as User[];
}

async function main() {
  await insert();
  const users = await select();
  console.log("Queried Users:", users);
}

main();
```

---

## **4️⃣ Insert a Single User (Using CLI)**

```sh
echo '{"id": "1", "name": "emi", "age": 47, "email": "emi@emi.com", "salary": 5000}' > data.json
bq insert emidataset.users data.json
```

---

## **5️⃣ Run the TypeScript Script**

```sh
ts-node index.ts
```

Expected Output:

```sh
✅ Data inserted successfully!
Queried Users: [ { id: '1', name: 'emi', age: 47, email: 'emi@emi.com', salary: 5000 } ]
```

---

## **6️⃣ Notes on BigQuery Batch Ingestion**

- **Batch ingestion** is **free** but is **not real-time**.
- You are charged for **storing and querying data**, not for inserting it.
- BigQuery is a **structured data store**, making it ideal for analytics.

---
