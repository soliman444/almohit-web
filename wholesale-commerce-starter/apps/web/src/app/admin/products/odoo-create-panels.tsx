"use client";

import { useRef, useState } from "react";
import {
  addOdooAttributeValueAction,
  createOdooAttributeAction,
  createOdooBrandAction,
  createOdooCategoryAction,
} from "../../../lib/actions";

type CategoryOption = { id: string; name: string; depth: number };
type BrandOption = { id: string; name: string };
type AttributeOption = { id: number; name: string; values: Array<{ id: number; name: string }> };

function CreateToggle({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="stack">
      <button type="button" className="btn secondary" onClick={onToggle}>
        {open ? "Cancel" : label}
      </button>
      {open ? children : null}
    </div>
  );
}

export function CreateCategoryPanel({
  categories,
  onCreated,
}: {
  categories: CategoryOption[];
  onCreated: (category: CategoryOption) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    setPending(true);
    setError("");
    const formData = new FormData();
    formData.set("name", name);
    formData.set("parentId", parentRef.current?.value ?? "");
    const result = await createOdooCategoryAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (nameRef.current) nameRef.current.value = "";
    onCreated(result.data);
    setOpen(false);
  }

  return (
    <CreateToggle label="Create category" open={open} onToggle={() => setOpen((current) => !current)}>
      <div className="stack">
        {error && <p className="error">{error}</p>}
        <label className="field">Name<input ref={nameRef} disabled={pending} /></label>
        <label className="field">Parent
          <select ref={parentRef} defaultValue="" disabled={pending}>
            <option value="">Top level</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{"— ".repeat(category.depth)}{category.name}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" disabled={pending} onClick={() => void save()}>
          {pending ? "Saving…" : "Save category"}
        </button>
      </div>
    </CreateToggle>
  );
}

export function CreateBrandPanel({ onCreated }: { onCreated: (brand: BrandOption) => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) {
      setError("Enter a brand name.");
      return;
    }
    setPending(true);
    setError("");
    const formData = new FormData();
    formData.set("name", name);
    const file = imageRef.current?.files?.[0];
    if (file) formData.set("image", file);
    const result = await createOdooBrandAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (nameRef.current) nameRef.current.value = "";
    if (imageRef.current) imageRef.current.value = "";
    onCreated(result.data);
    setOpen(false);
  }

  return (
    <CreateToggle label="Create brand" open={open} onToggle={() => setOpen((current) => !current)}>
      <div className="stack">
        {error && <p className="error">{error}</p>}
        <label className="field">Name<input ref={nameRef} disabled={pending} /></label>
        <label className="field">Image
          <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" disabled={pending} />
        </label>
        <button type="button" className="btn" disabled={pending} onClick={() => void save()}>
          {pending ? "Saving…" : "Save brand"}
        </button>
      </div>
    </CreateToggle>
  );
}

export function CreateAttributePanel({ onCreated }: { onCreated: (attribute: AttributeOption) => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const valuesRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    const name = nameRef.current?.value.trim() ?? "";
    const values = valuesRef.current?.value.trim() ?? "";
    if (!name) {
      setError("Enter an attribute name.");
      return;
    }
    if (!values) {
      setError("Enter at least one attribute value.");
      return;
    }
    setPending(true);
    setError("");
    const formData = new FormData();
    formData.set("name", name);
    formData.set("values", values);
    const result = await createOdooAttributeAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (nameRef.current) nameRef.current.value = "";
    if (valuesRef.current) valuesRef.current.value = "";
    onCreated(result.data);
    setOpen(false);
  }

  return (
    <CreateToggle label="Create attribute" open={open} onToggle={() => setOpen((current) => !current)}>
      <div className="stack">
        {error && <p className="error">{error}</p>}
        <label className="field">Name<input ref={nameRef} placeholder="Color" disabled={pending} /></label>
        <label className="field">Values
          <textarea ref={valuesRef} placeholder={"Red\nBlue\nGreen"} disabled={pending} />
        </label>
        <button type="button" className="btn" disabled={pending} onClick={() => void save()}>
          {pending ? "Saving…" : "Save attribute"}
        </button>
      </div>
    </CreateToggle>
  );
}

export function AddAttributeValuePanel({
  attributeId,
  onUpdated,
}: {
  attributeId: number;
  onUpdated: (attribute: AttributeOption) => void;
}) {
  const valueRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    const value = valueRef.current?.value.trim() ?? "";
    if (!value) {
      setError("Enter a value to add.");
      return;
    }
    setPending(true);
    setError("");
    const formData = new FormData();
    formData.set("attributeId", String(attributeId));
    formData.set("values", value);
    const result = await addOdooAttributeValueAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (valueRef.current) valueRef.current.value = "";
    onUpdated(result.data);
  }

  return (
    <div className="stack">
      {error && <p className="error">{error}</p>}
      <label className="field">Add value
        <input ref={valueRef} placeholder="Green" disabled={pending} />
      </label>
      <button type="button" className="btn secondary" disabled={pending} onClick={() => void save()}>
        {pending ? "Saving…" : "Add value"}
      </button>
    </div>
  );
}
