import Link from "next/link";
import { db } from "@/db";
import { storeBrand, storeCategoryEnum } from "@/db/schema";
import {
  Card,
  EmptyState,
  PageHeader,
  ghostLinkClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteStore, saveStore } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  clothing: "Clothing",
  jewelry: "Jewelry",
  flowers: "Flowers",
  beauty: "Beauty",
  other: "Other",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const items = await db.select().from(storeBrand).orderBy(storeBrand.name);
  const editing = edit ? items.find((i) => String(i.id) === edit) : undefined;

  return (
    <div>
      <PageHeader
        title="Stores"
        subtitle="Trusted brands and shops, kept in one allowlist."
      />

      <Card className="mb-8">
        <h2 className="mb-4 font-serif text-lg text-ink-800">
          {editing ? "Edit store" : "Add a store"}
        </h2>
        <form action={saveStore} className="space-y-4" key={editing?.id ?? "new"}>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="category">
                Category
              </label>
              <select
                id="category"
                name="category"
                defaultValue={editing?.category ?? "other"}
                className={inputClass}
              >
                {storeCategoryEnum.enumValues.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="url">
              Website
            </label>
            <input
              id="url"
              name="url"
              type="url"
              placeholder="https://…"
              defaultValue={editing?.url ?? ""}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="allowlisted"
              defaultChecked={editing?.allowlisted ?? true}
              className="h-4 w-4 rounded border-ink-100"
            />
            Allowlisted
          </label>

          <div className="flex gap-3">
            <button type="submit" className={primaryButtonClass}>
              {editing ? "Save changes" : "Add store"}
            </button>
            {editing && (
              <Link href="/stores" className={secondaryButtonClass}>
                Cancel
              </Link>
            )}
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState>No stores yet — add the first one you trust.</EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((store) => (
            <Card key={store.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink-800">{store.name}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">
                    {CATEGORY_LABELS[store.category]}
                  </span>
                  {store.allowlisted && (
                    <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-700">
                      Allowlisted
                    </span>
                  )}
                </div>
                {store.url && (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm text-clay-600 hover:underline"
                  >
                    {store.url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/stores?edit=${store.id}`} className={ghostLinkClass}>
                  Edit
                </Link>
                <form action={deleteStore}>
                  <input type="hidden" name="id" value={store.id} />
                  <DeleteButton />
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
