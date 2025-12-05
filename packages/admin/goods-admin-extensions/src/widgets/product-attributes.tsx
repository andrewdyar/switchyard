/* @refresh reload */
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Label, Input, Select, Text, Switch } from "@medusajs/ui"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useEffect } from "react"
import { sdk } from "../lib/sdk"

type GoodsProductAttributes = {
  id: string | null
  brand: string | null
  unit_of_measure: string
  priced_by_weight: boolean
  is_organic: boolean
  is_gluten_free: boolean
  is_vegan: boolean
  is_non_gmo: boolean
  is_new: boolean
  on_ad: boolean
  best_available: boolean
  show_coupon_flag: boolean
  in_assortment: boolean
  full_category_hierarchy: string | null
  product_page_url: string | null
  inventory_type: "Warehouse" | "Sweep" | null
  warehouse_aisle: string | null
  warehouse_shelf_group: string | null
  warehouse_shelf: string | null
}

const ProductAttributesWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const [attributes, setAttributes] = useState<GoodsProductAttributes | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<GoodsProductAttributes>({
    id: null,
    brand: "",
    unit_of_measure: "each",
    priced_by_weight: false,
    is_organic: false,
    is_gluten_free: false,
    is_vegan: false,
    is_non_gmo: false,
    is_new: false,
    on_ad: false,
    best_available: false,
    show_coupon_flag: false,
    in_assortment: true,
    full_category_hierarchy: "",
    product_page_url: "",
    inventory_type: null,
    warehouse_aisle: null,
    warehouse_shelf_group: null,
    warehouse_shelf: null,
  })

  const unitOfMeasureOptions = [
    { value: "each", label: "Each" },
    { value: "lb", label: "Pound (lb)" },
    { value: "oz", label: "Ounce (oz)" },
    { value: "gal", label: "Gallon (gal)" },
    { value: "fl_oz", label: "Fluid Ounce (fl oz)" },
    { value: "pt", label: "Pint (pt)" },
    { value: "qt", label: "Quart (qt)" },
    { value: "ml", label: "Milliliter (ml)" },
    { value: "l", label: "Liter (l)" },
    { value: "g", label: "Gram (g)" },
    { value: "kg", label: "Kilogram (kg)" },
    { value: "ct", label: "Count" },
  ]

  const inventoryTypeOptions = [
    { value: "Warehouse", label: "Warehouse" },
    { value: "Sweep", label: "Sweep" },
  ]

  useEffect(() => {
    const fetchAttributes = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = (await sdk.client.fetch(
          `/admin/products/${product.id}/attributes`
        )) as { attributes?: GoodsProductAttributes }

        if (data.attributes) {
          setAttributes(data.attributes)
          setFormData({
            ...formData,
            ...data.attributes,
            id: data.attributes.id || null,
            unit_of_measure: data.attributes.unit_of_measure || "each",
            in_assortment: data.attributes.in_assortment !== false,
          })
        }
      } catch (err) {
        setError("Failed to load product attributes.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttributes()
  }, [product.id])

  const handleChange = (field: keyof GoodsProductAttributes, value: any) => {
    setFormData((prev) => {
      const newState = {
        ...prev,
        [field]: value,
      }

      // Clear warehouse location fields if inventory_type changes to "Sweep"
      if (field === "inventory_type" && value === "Sweep") {
        newState.warehouse_aisle = null
        newState.warehouse_shelf_group = null
        newState.warehouse_shelf = null
      }
      return newState
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = (await sdk.client.fetch(
        `/admin/products/${product.id}/attributes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      )) as { attributes?: GoodsProductAttributes }

      setAttributes(data.attributes || null)
      alert("Attributes saved successfully!")
    } catch (err) {
      setError(`Failed to save product attributes: ${(err as Error).message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const formatWarehouseLocation = () => {
    const { warehouse_aisle, warehouse_shelf_group, warehouse_shelf } = formData
    if (warehouse_aisle && warehouse_shelf_group && warehouse_shelf) {
      return `Aisle ${warehouse_aisle}${warehouse_shelf_group}, Shelf ${warehouse_shelf}`
    }
    return "N/A"
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Goods Product Attributes</Heading>
        </div>
        <div className="p-6">
          <Text>Loading attributes...</Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Goods Product Attributes</Heading>
        </div>
        <div className="p-6">
          <Text className="text-red-500">{error}</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Goods Product Attributes</Heading>
        <Button onClick={handleSave} isLoading={saving}>
          Save Attributes
        </Button>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand || ""}
            onChange={(e) => handleChange("brand", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="unit_of_measure">Unit of Measure</Label>
          <Select
            value={formData.unit_of_measure || "each"}
            onValueChange={(value) => handleChange("unit_of_measure", value)}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select unit" />
            </Select.Trigger>
            <Select.Content>
              {unitOfMeasureOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="col-span-2">
          <Label htmlFor="full_category_hierarchy">Full Category Hierarchy</Label>
          <Input
            id="full_category_hierarchy"
            value={formData.full_category_hierarchy || ""}
            onChange={(e) => handleChange("full_category_hierarchy", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="product_page_url">Product Page URL</Label>
          <Input
            id="product_page_url"
            value={formData.product_page_url || ""}
            onChange={(e) => handleChange("product_page_url", e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="priced_by_weight"
            checked={formData.priced_by_weight || false}
            onCheckedChange={(checked) => handleChange("priced_by_weight", checked)}
          />
          <Label htmlFor="priced_by_weight">Priced by Weight</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_organic"
            checked={formData.is_organic || false}
            onCheckedChange={(checked) => handleChange("is_organic", checked)}
          />
          <Label htmlFor="is_organic">Organic</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_gluten_free"
            checked={formData.is_gluten_free || false}
            onCheckedChange={(checked) => handleChange("is_gluten_free", checked)}
          />
          <Label htmlFor="is_gluten_free">Gluten Free</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_vegan"
            checked={formData.is_vegan || false}
            onCheckedChange={(checked) => handleChange("is_vegan", checked)}
          />
          <Label htmlFor="is_vegan">Vegan</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_non_gmo"
            checked={formData.is_non_gmo || false}
            onCheckedChange={(checked) => handleChange("is_non_gmo", checked)}
          />
          <Label htmlFor="is_non_gmo">Non-GMO</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_new"
            checked={formData.is_new || false}
            onCheckedChange={(checked) => handleChange("is_new", checked)}
          />
          <Label htmlFor="is_new">New Product</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="on_ad"
            checked={formData.on_ad || false}
            onCheckedChange={(checked) => handleChange("on_ad", checked)}
          />
          <Label htmlFor="on_ad">On Ad</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="best_available"
            checked={formData.best_available || false}
            onCheckedChange={(checked) => handleChange("best_available", checked)}
          />
          <Label htmlFor="best_available">Best Available</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="show_coupon_flag"
            checked={formData.show_coupon_flag || false}
            onCheckedChange={(checked) => handleChange("show_coupon_flag", checked)}
          />
          <Label htmlFor="show_coupon_flag">Show Coupon Flag</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="in_assortment"
            checked={formData.in_assortment || false}
            onCheckedChange={(checked) => handleChange("in_assortment", checked)}
          />
          <Label htmlFor="in_assortment">In Assortment</Label>
        </div>

        <div className="col-span-2">
          <Label htmlFor="inventory_type">Inventory Type</Label>
          <Select
            value={formData.inventory_type || ""}
            onValueChange={(value) => handleChange("inventory_type", value as "Warehouse" | "Sweep" | null)}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select inventory type" />
            </Select.Trigger>
            <Select.Content>
              {inventoryTypeOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {formData.inventory_type === "Warehouse" && (
          <>
            <div>
              <Label htmlFor="warehouse_aisle">Aisle</Label>
              <Input
                id="warehouse_aisle"
                value={formData.warehouse_aisle || ""}
                onChange={(e) => handleChange("warehouse_aisle", e.target.value)}
                placeholder="e.g., 3"
              />
            </div>
            <div>
              <Label htmlFor="warehouse_shelf_group">Shelf Group</Label>
              <Input
                id="warehouse_shelf_group"
                value={formData.warehouse_shelf_group || ""}
                onChange={(e) => handleChange("warehouse_shelf_group", e.target.value)}
                placeholder="e.g., C"
              />
            </div>
            <div>
              <Label htmlFor="warehouse_shelf">Shelf</Label>
              <Input
                id="warehouse_shelf"
                value={formData.warehouse_shelf || ""}
                onChange={(e) => handleChange("warehouse_shelf", e.target.value)}
                placeholder="e.g., 2"
              />
            </div>
            <div className="col-span-2">
              <Text size="small" className="text-ui-fg-subtle">
                Location: {formatWarehouseLocation()}
              </Text>
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductAttributesWidget
