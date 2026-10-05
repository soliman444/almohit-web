import { HeroFramingFields } from "../../../components/admin/image-framing";
import { createCategoryAction, updateCategoryAction } from "../../../lib/actions";

type ParentOption = { id: string; name: string; depth: number };

type CategoryValues = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  heroVideoUrl: string | null;
  heroPosterUrl: string | null;
  heroFocalX: number;
  heroFocalY: number;
  heroScale: number;
  sortOrder: number;
  status: boolean;
};

export function CategoryForm({
  action,
  parents,
  category,
}: {
  action: typeof createCategoryAction | typeof updateCategoryAction;
  parents: ParentOption[];
  category?: CategoryValues;
}) {
  return (
    <form className="card stack form-wide" action={action}>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="grid">
        <label className="field">Name<input name="name" defaultValue={category?.name} required /></label>
        <label className="field">Slug<input name="slug" defaultValue={category?.slug} placeholder="Optional" /></label>
        <label className="field">Sort order<input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} /></label>
      </div>
      <label className="field">Parent category
        <select name="parentId" defaultValue={category?.parentId ?? ""}>
          <option value="">No parent</option>
          {parents.map((item) => (
            <option key={item.id} value={item.id}>{"— ".repeat(item.depth)}{item.name}</option>
          ))}
        </select>
      </label>
      <label className="field">Description<textarea name="description" defaultValue={category?.description ?? ""} /></label>
      <div className="grid">
        <label className="field">Category hero video
          <input name="heroVideoUrl" defaultValue={category?.heroVideoUrl ?? ""} placeholder="/videos/categories/fruits.mp4 or https://..." />
        </label>
        <label className="field">Video poster
          <input name="heroPosterUrl" defaultValue={category?.heroPosterUrl ?? ""} placeholder="/images/categories/fruits-poster.jpg or https://..." />
        </label>
      </div>
      <p className="muted">Optional. Video is used only on this category page.</p>
      <HeroFramingFields
        key={category?.id ?? "new"}
        src={category?.heroPosterUrl ?? undefined}
        focalX={category?.heroFocalX}
        focalY={category?.heroFocalY}
        scale={category?.heroScale}
      />
      <label className="admin-check">
        <input type="checkbox" name="status" defaultChecked={category?.status ?? true} /> Active
      </label>
      <button className="btn">{category ? "Update category" : "Save category"}</button>
    </form>
  );
}
