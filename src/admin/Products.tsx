import type { Product } from "@/types/domain";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ImageOff,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextField,
  ToggleButton,
} from "@heroui/react";

import { useProductStore, useToastStore } from "@/lib/store";
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
  const [searchParams] = useSearchParams();
  const products = useProductStore((s) => s.products);
  const categories = useProductStore((s) => s.categories);
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

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PRODUCT });
    setModalOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("action") === "add") openAdd();
  }, []);

  const filtered = products.filter((p) => {
    const matchesCat = catFilter === "all" || p.category === catFilter;
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

  const handleSave = () => {
    const { name, category, price, stock, sku, description } = form;

    if (!name || !category || !price || !stock || !sku || !description) {
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

    const data: Partial<Product> = {
      ...form,
      price: priceNum,
      comparePrice: compareNum,
      stock: stockNum,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: form.images.filter(Boolean),
    };

    if (editingId) {
      updateProduct(editingId, data);
      addToast("Product saved successfully", "success");
    } else {
      addProduct(data);
      addToast("New product added to catalog", "success");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    addToast("Product removed from catalog", "info");
  };

  const handleToggleActive = (product: Product) => {
    updateProduct(product.id, { active: !product.active });
    addToast(
      `Product ${product.active ? "hidden from" : "published on"} live store`,
      "info",
    );
  };

  const handleToggleFeatured = (product: Product) => {
    updateProduct(product.id, { featured: !product.featured });
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
          {p.category}
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
            <div className="text-[11px] text-muted line-through">
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
              {categories.map((c) => (
                <ListBox.Item key={c.id} id={c.id}>
                  {c.name}
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
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Container scroll="inside" size="lg">
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
                        {categories.map((c) => (
                          <ListBox.Item key={c.id} id={c.id}>
                            {c.name}
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

                <TextField
                  isRequired
                  className="flex flex-col gap-1.5"
                  value={form.description}
                  onChange={(v) => updateForm("description", v)}
                >
                  <Label>Product Description *</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                  <FieldError />
                </TextField>

                <TextField
                  className="flex flex-col gap-1.5"
                  value={form.images[0] || ""}
                  onChange={(v) => updateForm("images", [v])}
                >
                  <Label>Image URL</Label>
                  <InputGroup>
                    <InputGroup.Input />
                  </InputGroup>
                </TextField>

                {form.images[0] && (
                  <div>
                    <span className="mb-1 block text-xs text-muted">
                      Image Preview:
                    </span>
                    <img
                      alt="Preview"
                      className="max-h-[110px] rounded-xl border border-border"
                      src={form.images[0]}
                    />
                  </div>
                )}

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
                <Button variant="outline" onPress={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={handleSave}>
                  {editingId ? "Save Changes" : "Publish Product"}
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
