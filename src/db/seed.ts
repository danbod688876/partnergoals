import { db } from "./index";
import { storeBrand } from "./schema";

async function seed() {
  await db
    .insert(storeBrand)
    .values([
      {
        name: "Leah Alexandra",
        category: "jewelry",
        url: "https://leahalexandra.com",
        allowlisted: true,
      },
      {
        name: "Quince",
        category: "clothing",
        url: "https://www.onequince.com",
        allowlisted: true,
      },
    ])
    .onConflictDoNothing();

  console.log("Seeded store_brand.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
