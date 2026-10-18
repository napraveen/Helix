import "./load-env";
import { resetAndSeed } from "../src/lib/graph/seed";

console.log("Connecting to FalkorDB:", {
  host: process.env.FALKORDB_HOST,
  port: process.env.FALKORDB_PORT,
  username: process.env.FALKORDB_USERNAME || "default",
  hasPassword: Boolean(process.env.FALKORDB_PASSWORD),
});


resetAndSeed()
  .then((result) => {
    console.log("Helix graph seeded", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
