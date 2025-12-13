import type { IStockLocationService } from '@switchyard/framework/types'
import type { IInventoryService } from '@switchyard/framework/types'
import type { IProductModuleService } from '@switchyard/framework/types'
import type { IPricingModuleService } from '@switchyard/framework/types'
import type { IPromotionModuleService } from '@switchyard/framework/types'
import type { ICustomerModuleService } from '@switchyard/framework/types'
import type { ISalesChannelModuleService } from '@switchyard/framework/types'
import type { ICartModuleService } from '@switchyard/framework/types'
import type { IRegionModuleService } from '@switchyard/framework/types'
import type { IApiKeyModuleService } from '@switchyard/framework/types'
import type { IStoreModuleService } from '@switchyard/framework/types'
import type { ITaxModuleService } from '@switchyard/framework/types'
import type { ICurrencyModuleService } from '@switchyard/framework/types'
import type { IPaymentModuleService } from '@switchyard/framework/types'
import type { IOrderModuleService } from '@switchyard/framework/types'
import type Settings from '@switchyard/medusa/settings'
import type { IAuthModuleService } from '@switchyard/framework/types'
import type { IUserModuleService } from '@switchyard/framework/types'
import type { IFulfillmentModuleService } from '@switchyard/framework/types'
import type { INotificationModuleService } from '@switchyard/framework/types'
import type { ICacheService } from '@switchyard/framework/types'
import type { IEventBusModuleService } from '@switchyard/framework/types'
import type { IWorkflowEngineService } from '@switchyard/framework/types'
import type { ILockingModule } from '@switchyard/framework/types'
import type { IFileModuleService } from '@switchyard/framework/types'
import type InventoryGroup from '@switchyard/inventory-group'

declare module '@switchyard/framework/types' {
  interface ModuleImplementations {
    'stock_location': IStockLocationService,
    'inventory': IInventoryService,
    'product': IProductModuleService,
    'pricing': IPricingModuleService,
    'promotion': IPromotionModuleService,
    'customer': ICustomerModuleService,
    'sales_channel': ISalesChannelModuleService,
    'cart': ICartModuleService,
    'region': IRegionModuleService,
    'api_key': IApiKeyModuleService,
    'store': IStoreModuleService,
    'tax': ITaxModuleService,
    'currency': ICurrencyModuleService,
    'payment': IPaymentModuleService,
    'order': IOrderModuleService,
    'settings': InstanceType<(typeof Settings)['service']>,
    'auth': IAuthModuleService,
    'user': IUserModuleService,
    'fulfillment': IFulfillmentModuleService,
    'notification': INotificationModuleService,
    'cache': ICacheService,
    'event_bus': IEventBusModuleService,
    'workflows': IWorkflowEngineService,
    'locking': ILockingModule,
    'file': IFileModuleService,
    'inventoryGroup': InstanceType<(typeof InventoryGroup)['service']>
  }
}