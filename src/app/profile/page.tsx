import { db } from "@/db";
import { partner } from "@/db/schema";
import { Card, PageHeader, inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { saveProfile } from "./actions";

export default async function ProfilePage() {
  const [row] = await db.select().from(partner).limit(1);

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="The essentials — kept in one place so you never have to guess."
      />

      <Card>
        <form action={saveProfile} className="space-y-5">
          {row && <input type="hidden" name="id" value={row.id} />}

          <div>
            <label className={labelClass} htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={row?.name ?? ""}
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="birthday">
                Birthday
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                defaultValue={row?.birthday ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="city">
                City
              </label>
              <input
                id="city"
                name="city"
                defaultValue={row?.city ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="neighborhood">
              Neighborhood
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              defaultValue={row?.neighborhood ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass} htmlFor="clothingSize">
                Clothing size
              </label>
              <input
                id="clothingSize"
                name="clothingSize"
                defaultValue={row?.clothingSize ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="shoeSize">
                Shoe size
              </label>
              <input
                id="shoeSize"
                name="shoeSize"
                defaultValue={row?.shoeSize ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="ringSize">
                Ring size
              </label>
              <input
                id="ringSize"
                name="ringSize"
                defaultValue={row?.ringSize ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="dietaryNotes">
              Dietary notes
            </label>
            <textarea
              id="dietaryNotes"
              name="dietaryNotes"
              rows={3}
              defaultValue={row?.dietaryNotes ?? ""}
              className={inputClass}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {row?.updatedAt && (
              <span className="text-xs text-ink-400">
                Last updated {new Date(row.updatedAt).toLocaleDateString()}
              </span>
            )}
            <button type="submit" className={primaryButtonClass}>
              Save
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
