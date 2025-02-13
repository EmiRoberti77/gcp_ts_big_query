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
const bigquery = new BigQuery({
  credentials,
});

async function craeteUsers(dataLength: number): Promise<User[]> {
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
  console.log(`created ${dataLength} test users`);
  return users;
}

async function insert(): Promise<boolean> {
  const dataset = bigquery.dataset(datasetId);
  const table = dataset.table(tableId);
  const users = await craeteUsers(USERS_COUNT);
  try {
    const response = await table.insert(users);
    console.log(response);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function select(): Promise<User[]> {
  const query = SELECT_FROM_USERS;
  const options = { query };
  const [rows] = await bigquery.query(options);
  return rows as User[];
}

async function main() {
  await insert();
  const users = await select();
  console.log(users);
}
main();
