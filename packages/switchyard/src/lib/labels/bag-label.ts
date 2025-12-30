/**
 * Bag Label Generation
 * 
 * Generates ZPL labels for bags used in order fulfillment
 */

export interface BagItem {
  name: string
  quantity: number
}

export interface BagLabelData {
  customerFirstName: string
  customerLastName?: string
  items: (string | BagItem)[]
  bagNumber: number
  totalBags: number
  bagId: string
  temperatureZone?: "ambient" | "chilled" | "frozen"
  orderId?: string
}

export const EXAMPLE_BAG_LABEL_DATA: BagLabelData = {
  customerFirstName: "John",
  customerLastName: "Doe",
  items: ["Milk", "Bread", "Eggs"],
  bagNumber: 1,
  totalBags: 2,
  bagId: "BAG-001",
  temperatureZone: "chilled",
  orderId: "ORD-12345",
}

export function generateBagLabel(data: BagLabelData): string {
  const customerName = data.customerLastName 
    ? `${data.customerFirstName} ${data.customerLastName}` 
    : data.customerFirstName
  
  const itemList = data.items.map(item => 
    typeof item === 'string' ? item : `${item.name} (${item.quantity})`
  ).slice(0, 5).join(', ')
  
  const zone = data.temperatureZone?.toUpperCase() || 'AMBIENT'
  
  return `^XA
^FO50,30^A0N,40,40^FD${customerName}^FS
^FO50,80^A0N,30,30^FDBag ${data.bagNumber}/${data.totalBags}^FS
^FO50,120^A0N,25,25^FD${zone}^FS
^FO50,160^A0N,20,20^FD${itemList}^FS
${data.orderId ? `^FO50,200^A0N,20,20^FDOrder: ${data.orderId}^FS` : ''}
^FO50,240^BY3^BCN,80,Y,N,N^FD${data.bagId}^FS
^XZ`
}

export function generateBagLabelWithOptions(
  data: BagLabelData,
  options?: { width?: number; height?: number }
): string {
  return generateBagLabel(data)
}
