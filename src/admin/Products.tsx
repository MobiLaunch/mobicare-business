import type { Product } from "@/types/domain";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ImageOff,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  Switch,
  TextArea,
  TextField,
  ToggleButton,
} from "@heroui/react";

import { useProductStore, useToastStore } from "@/lib/store";
import { isSupabaseConfigured, sbUploadSiteMedia } from "@/lib/supabase";
import AdminPageHeader from "@/admin/components/AdminPageHeader";
import AdminDataTable, {
  type AdminDataTableColumn,
} from "@/admin/components/AdminDataTable";
import AdminConfirmDialog from "@/admin/components/AdminConfirmDialog";

interface ProductFormState {
  name: string;
  category: string;
  price: string;
  comparePrice: string;
  stock: string;
  sku: string;
  description: string;
  images: string[];
  tags: string;
  featured: boolean;
  active: boolean;
  shippingDays: { min: number; max: number };
}

const EMPTY_PRODUCT: ProductFormState = {
  name: "",
  category: "",
  price: "",
  comparePrice: "",
  stock: "",
  sku: "",
  description: "",
  images: [""],
  tags: "",
  featured: false,
  active: true,
  shippingDays: { min: 3, max: 7 },
};

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs font-bold text-danger">
        Out of Stock
      </span>
    );
  if (stock <= 5)
    return (
      <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">
        Low ({stock})
      </span>
    );

  return (
    <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
      {stock} in stock
    </span>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const products = useProductStore((s) => s.products);
  const categories = useProductStore((s) => s.categories);
  const topLevelCategories = categories.filter((c) => !c.parentId);
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || id;
  // Flat list, not react-aria's ListBox.Section+Header: that combination
  // reproducibly crashed the popover on open in this HeroUI/react-aria
  // version (a "recovered from concurrent render error" + hang on click) —
  // this is the fallback the implementation plan called out in advance for
  // exactly that possibility. Subcategories are visually indented instead.
  const categoryListItems = topLevelCategories.flatMap((top) => [
    { id: top.id, label: top.name, indent: false },
    ...categories
      .filter((c) => c.parentId === top.id)
      .map((sub) => ({ id: sub.id, label: sub.name, indent: true })),
  ]);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const deleteProduct = useProductStore((s) => s.deleteProduct);
  const addToast = useToastStore((s) => s.add);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT, images: [""] });
    setModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setEditingId(null);
      setForm({ ...EMPTY_PRODUCT, images: [""] });
      setModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = products.filter((p) => {
    const matchesCat =
      catFilter === "all" ||
      p.category === catFilter ||
      categories.some((c) => c.id === p.category && c.parentId === catFilter);
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());

    return matchesCat && matchesSearch;
  });

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      ...product,
      price: String(product.price),
      comparePrice: product.comparePrice ? String(product.comparePrice) : "",
      stock: String(product.stock),
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      images: product.images?.length ? product.images : [""],
    });
    setModalOpen(true);
  };

  const updateForm = <K extends keyof ProductFormState>(
    k: K,
    v: ProductFormState[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  const setImageAt = (index: number, url: string) =>
    setForm((f) => ({
      ...f,
      images: f.images.map((img, i) => (i === index ? url : img)),
    }));

  const addImageSlot = () =>
    setForm((f) => ({ ...f, images: [...f.images, ""] }));

  const removeImageSlot = (index: number) =>
    setForm((f) => {
      const next = f.images.filter((_, i) => i !== index);

      return { ...f, images: next.length ? next : [""] };
    });

  const handleImageFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setUploadingImg(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (isSupabaseConfigured()) {
        const res = await sbUploadSiteMedia(file);

        if (res.url) {
          uploadedUrls.push(res.url);
        } else {
          addToast(res.error || `Failed to upload ${file.name}`, "error");
        }
      } else {
        const dataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });

        if (dataUrl) uploadedUrls.push(dataUrl);
      }
    }

    setUploadingImg(false);
    if (uploadedUrls.length > 0) {
      setForm((f) => {
        const existing = f.images.map((s) => s.trim()).filter(Boolean);

        return { ...f, images: [...existing, ...uploadedUrls] };
      });
      addToast(
        `Uploaded ${uploadedUrls.length} image${uploadedUrls.length !== 1 ? "s" : ""}`,
        "success",
      );
    }
  };

  const handleSave = async () => {
    const { name, category, price, stock, sku, description } = form;

    if (!name.trim() || !category || !price || !stock || !sku.trim() || !description.trim()) {
      addToast("Please fill in all required fields (*)", "error");

      return;
    }
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    const compareNum = form.comparePrice ? parseFloat(form.comparePrice) : null;

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      addToast("Please enter a valid non-negative price", "error");

      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      addToast("Please enter a valid stock quantity", "error");

      return;
    }
    if (
      compareNum != null &&
      (!Number.isFinite(compareNum) || compareNum < 0)
    ) {
      addToast("Please enter a valid compare-at price", "error");

      return;
    }
    if (compareNum != null && compareNum <= priceNum) {
      addToast("Compare-at price must be higher than the selling price", "error");

      return;
    }

    const data: Partial<Product> = {
      ...form,
      name: name.trim(),
      sku: sku.trim(),
      description: description.trim(),
      price: priceNum,
      comparePrice: compareNum,
      stock: stockNum,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: form.images.map((u) => u.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateProduct(editingId, data);
        addToast("Product saved successfully", "success");
      } else {
        await addProduct(data);
        addToast("New product added to catalog", "success");
      }
      setModalOpen(false);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to save product.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      addToast("Product removed from catalog", "info");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to delete product.",
        "error",
      );
    }
  };

  const handleToggleActive = async (product: Product) => {
    const nextActive = !product.active;
    try {
      await updateProduct(product.id, { active: nextActive });
      addToast(
        `Product ${nextActive ? "published on" : "hidden from"} live store`,
        "info",
      );
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Could not update product visibility.",
        "error",
      );
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      await updateProduct(product.id, { featured: !product.featured });
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Could not update featured status.",
        "error",
      );
    }
  };

  const columns: AdminDataTableColumn<Product>[] = [
    {
      key: "details",
      header: "Product Details",
      render: (p) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-tertiary">
            {p.images?.[0] ? (
              <img
                alt={p.name}
                className="size-full object-cover"
                src={p.images[0]}
              />
            ) : (
              <ImageOff className="size-4 text-muted" />
            )}
          </div>
          <strong className="text-sm text-foreground">{p.name}</strong>
        </div>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      render: (p) => (
        <code className="rounded-md bg-surface-tertiary px-1.5 py-0.5 text-xs font-bold">
          {p.sku}
        </code>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (p) => (
        <span className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold">
          {categoryName(p.category)}
        </span>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (p) => (
        <div>
          <strong className="text-sm text-accent">${p.price.toFixed(2)}</strong>
          {p.comparePrice && (
            <div className="text-caption text-muted line-through">
              ${p.comparePrice.toFixed(2)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => <StockBadge stock={p.stock} />,
    },
    {
      key: "active",
      header: "Visibility",
      render: (p) => (
        <Switch isSelected={p.active} onChange={() => handleToggleActive(p)}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      ),
    },
    {
      key: "featured",
      header: "Featured",
      render: (p) => (
        <ToggleButton
          isIconOnly
          aria-label={p.featured ? "Remove from featured" : "Mark as featured"}
          isSelected={p.featured}
          variant="ghost"
          onChange={() => handleToggleFeatured(p)}
        >
          <Star
            className={`size-4 ${p.featured ? "fill-warning text-warning" : "text-muted"}`}
          />
        </ToggleButton>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            aria-label="Edit product"
            variant="ghost"
            onPress={() => openEdit(p)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            isIconOnly
            aria-label="Delete product"
            variant="ghost"
            onPress={() => setDeleteConfirm(p.id)}
          >
            <Trash2 className="size-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        action={
          <Button variant="primary" onPress={openAdd}>
            <Plus className="size-4" />
            <span>Add New Product</span>
          </Button>
        }
        description={`${products.length} total items · ${products.filter((p) => p.active).length} currently active on store`}
        eyebrow="Inventory Catalog"
        title="Products Management"
      />

      <div className="mb-6 flex flex-wrap gap-4">
        <TextField
          className="min-w-[240px] flex-1"
          value={search}
          onChange={setSearch}
        >
          <InputGroup>
            <InputGroup.Prefix>
              <Search className="size-4" />
            </InputGroup.Prefix>
            <InputGroup.Input placeholder="Search by product name or SKU code…" />
          </InputGroup>
        </TextField>

        <Select
          className="w-full sm:w-56"
          selectedKey={catFilter}
          onSelectionChange={(key) => setCatFilter(String(key))}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">All Categories</ListBox.Item>
              {categoryListItems.map((item) => (
                <ListBox.Item key={item.id} className={item.indent ? "pl-7 text-muted" : ""} id={item.id}>
                  {item.indent ? `— ${item.label}` : item.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        emptyState={{
          icon: PackageOpen,
          title: "No matching products found",
          description: "Try adjusting your search criteria or category filter.",
        }}
        rowKey={(p) => p.id}
      />

      {/* Edit / Create modal */}
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
        <Modal.Backdrop className="z-[100]">
          <Modal.Container className="pb-24 lg:pb-0" scroll="inside" size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {editingId
                    ? "Edit Product Details"
                    : "Create New Catalog Product"}
                </Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <TextField
                  isRequired
                  className="flex flex-col gap-1.5"
                  value={form.name}
                  onChange={(v) => updateForm("name", v)}
                >
                  <Label>Product Name *</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                  <FieldError />
                </TextField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    placeholder="Select category"
                    selectedKey={form.category || null}
                    onSelectionChange={(key) =>
                      updateForm("category", String(key))
                    }
                  >
                    <Label>Category *</Label>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {categoryListItems.map((item) => (
                          <ListBox.Item key={item.id} className={item.indent ? "pl-7 text-muted" : ""} id={item.id}>
                            {item.indent ? `— ${item.label}` : item.label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <TextField
                    isRequired
                    className="flex flex-col gap-1.5"
                    value={form.sku}
                    onChange={(v) => updateForm("sku", v)}
                  >
                    <Label>SKU Code *</Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                    <FieldError />
                  </TextField>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <TextField
                    isRequired
                    className="flex flex-col gap-1.5"
                    type="number"
                    value={form.price}
                    onChange={(v) => updateForm("price", v)}
                  >
                    <Label>Selling Price ($) *</Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                    <FieldError />
                  </TextField>
                  <TextField
                    className="flex flex-col gap-1.5"
                    type="number"
                    value={form.comparePrice}
                    onChange={(v) => updateForm("comparePrice", v)}
                  >
                    <Label>Compare Price ($)</Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                  </TextField>
                  <TextField
                    isRequired
                    className="flex flex-col gap-1.5"
                    type="number"
                    value={form.stock}
                    onChange={(v) => updateForm("stock", v)}
                  >
                    <Label>Stock Units *</Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                    <FieldError />
                  </TextField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    className="flex flex-col gap-1.5"
                    type="number"
                    value={String(form.shippingDays.min)}
                    onChange={(v) =>
                      updateForm("shippingDays", {
                        ...form.shippingDays,
                        min: parseInt(v, 10) || 1,
                      })
                    }
                  >
                    <Label>Est. Min Days</Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                  </TextField>
                  <TextField
                    className="flex flex-col gap-1.5"
                    type="number"
                    value={String(form.shippingDays.max)}
                    onChange={(v) =>
                      updateForm("shippingDays", {
                        ...form.shippingDays,
                        max: parseInt(v, 10) || 7,
                      })
                    }
                  >
                    <Label>Est. Max Days</Label>
                    <InputGroup>
                      <InputGroup.Input />
                    </InputGroup>
                  </TextField>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-description">
                    Product Description *
                  </Label>
                  <TextArea
                    id="product-description"
                    placeholder="Detailed specs, compatibility, warranty notes…"
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Product Images</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={imageInputRef}
                        multiple
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={handleImageFileUpload}
                      />
                      <Button
                        isDisabled={uploadingImg}
                        size="sm"
                        variant="outline"
                        onPress={() => imageInputRef.current?.click()}
                      >
                        {uploadingImg ? (
                          <Spinner size="sm" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        <span>
                          {uploadingImg ? "Uploading…" : "Upload Image"}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={addImageSlot}
                      >
                        <Plus className="size-3.5" />
                        <span>Add URL</span>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {form.images.map((imgUrl, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <TextField
                          aria-label={`Product image URL ${idx + 1}`}
                          className="flex-1"
                          value={imgUrl}
                          onChange={(v) => setImageAt(idx, v)}
                        >
                          <InputGroup>
                            <InputGroup.Input
                              placeholder={
                                idx === 0
                                  ? "Primary image URL (https://…)"
                                  : `Gallery image ${idx + 1} URL (https://…)`
                              }
                            />
                          </InputGroup>
                        </TextField>
                        {(form.images.length > 1 || imgUrl) && (
                          <Button
                            isIconOnly
                            aria-label={`Remove image ${idx + 1}`}
                            variant="ghost"
                            onPress={() => removeImageSlot(idx)}
                          >
                            <X className="size-4 text-danger" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {form.images.some((u) => u.trim()) && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {form.images
                        .map((u) => u.trim())
                        .filter(Boolean)
                        .map((u, idx) => (
                          <div
                            key={`${u}-${idx}`}
                            className="relative size-16 overflow-hidden rounded-xl border border-border bg-surface-tertiary"
                          >
                            <img
                              alt={`Preview ${idx + 1}`}
                              className="size-full object-cover"
                              src={u}
                            />
                            {idx === 0 && (
                              <span className="absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-[10px] font-bold text-white">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <TextField
                  className="flex flex-col gap-1.5"
                  value={form.tags}
                  onChange={(v) => updateForm("tags", v)}
                >
                  <Label>Tags (comma separated)</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                </TextField>

                <div className="flex flex-wrap gap-8 pt-2">
                  <div className="flex items-center gap-3.5">
                    <Switch
                      isSelected={form.active}
                      onChange={(v) => updateForm("active", v)}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                    <div>
                      <strong className="block text-sm text-foreground">
                        Active Listing
                      </strong>
                      <span className="text-xs text-muted">
                        Visible to shoppers
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <Switch
                      isSelected={form.featured}
                      onChange={(v) => updateForm("featured", v)}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                    <div>
                      <strong className="block text-sm text-foreground">
                        Featured Product
                      </strong>
                      <span className="text-xs text-muted">
                        Highlight on storefront
                      </span>
                    </div>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer className="justify-end gap-2">
                <Button
                  isDisabled={saving}
                  variant="outline"
                  onPress={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  isDisabled={saving || uploadingImg}
                  variant="primary"
                  onPress={handleSave}
                >
                  {saving ? <Spinner size="sm" /> : null}
                  <span>
                    {saving
                      ? "Saving…"
                      : editingId
                        ? "Save Changes"
                        : "Publish Product"}
                  </span>
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AdminConfirmDialog
        description="This product will be permanently removed from your catalog store inventory."
        isOpen={!!deleteConfirm}
        title="Confirm Deletion"
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  );
}
