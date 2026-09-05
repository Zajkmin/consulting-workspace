import { testSharePointConnectivity } from "../src/services/sharepoint/connectivity.ts";

const result = await testSharePointConnectivity();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.errors.length > 0) process.exitCode = 1;
