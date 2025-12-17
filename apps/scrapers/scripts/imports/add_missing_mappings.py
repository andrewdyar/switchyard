#!/usr/bin/env python3
"""Add missing product_store_mappings for 2 HEB products."""

import sys
from heb_product_scraper import HEBProductScraper
from supabase_client import get_client

cookies = 'HEB_SHOPPING_LIST=%7B%22sort%22%3A%22CATEGORY%22%2C%22sortDirection%22%3A%22ASC%22%7D; visid_incap_2302070=gQxxiUt0RIe/JJ4X0cDvXWRQIWkAAAAAQUIPAAAAAACjSIPinJiLjYBU6MOsLpFn; incap_ses_1181_2302070=G0VhLKkZZVxYSBTqrcFjEBPDIWkAAAAAi3pF+0/CnQf52KB58dy1KA==; HEB_AMP_DEVICE_ID=h-99eefad5-3a2b-4f3f-8680-c656a699ff86; sst=hs:sst:fOSMejWH03DWtY0m-V0HK; sst.sig=GIPvLvirfczeQ2yQjFeTKD-DlXtzBUAWRQDPRpGvaIY; AMP_MKTG_760524e2ba=JTdCJTdE; SHOPPING_STORE_ID=202; CURR_SESSION_STORE=202; USER_CHOSEN_STORE=true; incap_ses_117_2302070=1PjXfc4dWmve/w8OWKufAeHWIWkAAAAA4gQkDilNVfQetvg2jpDyuA==; incap_ses_1433_2302070=8ZbMAw81TlmZYWB+UwrjE4PxIWkAAAAARYLB9q1Myltetjc2vcFL5w==; incap_ses_205_2302070=PONjHZSqVS03Wu0V1U7YAjsbImkAAAAA8sUVvphYDZecf/0uIL4gDw==; incap_ses_166_2302070=iloaNj/xFEZZ3EReqMBNArAfImkAAAAA41zNQWifrg6vus/iUUI9PA==; incap_ses_201_2302070=PBccSHXEcRBCVx+D2hjKAmpyImkAAAAAq0WcLWbaXMqdQ3SVcV7PlQ==; incap_ses_1682_2302070=SGEmYMl3JyWh1w5fjapXF3J5ImkAAAAAzFDcZv9NnLWUq+O/7zJu1Q==; incap_ses_1436_2302070=opB3Ik+P6UqVqkjA0bLtE8d/ImkAAAAAYpXZ3WrSE29lYBPZhgf3VQ==; incap_ses_1179_2302070=rDV0bpHW/Q6hqO+CTKZcEKKvImkAAAAA5a7lgiHU0M4Uoy59Biv0RA==; incap_ses_1680_2302070=+20RDUOC5jXnZZsWkI9QF/a1ImkAAAAAcOYted3XwKK+X+PMcPF83w==; incap_ses_215_2302070=t+7QDLjBowBJ+yeHx9X7AhfDImkAAAAA7tlHMSW+6IBudchOylh6WA==; incap_ses_1659_2302070=1fqeE5fNhxtrdUjaSvQFF2rJImkAAAAAMlgiNDKxdisR1pzdv6HNbQ==; incap_ses_214_2302070=CxFiBKB2WkGSIOrhSEj4AjbQImkAAAAA8uAyDBFfZyGUWaV2RUnHlQ==; incap_ses_68_2302070=DHrpJ1m9wiD52Mz4HJbxAMbWImkAAAAApWSPoMQSSrdGjSqLIcKt9g==; incap_ses_204_2302070=NpQ/BkSKbRQvGou8WMHUApLdImkAAAAAyXuKDqQakVlGkbO6aoeE0Q==; incap_ses_1180_2302070=P/egH7+tZi9ce/pFLzRgENrgImkAAAAAY6XYwM95o+/7Q/P0QarYYg==; incap_ses_619_2302070=rn8xCtJMITze3bzZrCGXCDvqImkAAAAAjLLyNqZNUnBsM9wSOH5mHw==; incap_ses_1681_2302070=IQLdUG2FSxGviSW7Dh1UF38AI2kAAAAAjjYtGLNmWHniSo3w7DoJUQ==; incap_ses_1684_2302070=gSaAU/o+bmCol8FUiMVeF7geI2kAAAAAlRkDYmBtnmuY8i7RQgYS2w==; incap_ses_1663_2302070=1YB2GuCULTFMHU/OKyoUF58nI2kAAAAAQiUVrjuRcCZVao2e57/4WQ==; incap_ses_1438_2302070=UJHDQdOUwmO4DGlV0c30EzAuI2kAAAAAw/KHFdxyw0ilrd9ApNolVg==; incap_ses_211_2302070=0mPQSpjuU2KplKH0zJ/tAjc1I2kAAAAA9htbbDIssZGAPeUELLYJsw==; incap_ses_620_2302070=pBy5FRjcyUPyt/jQLa+aCIw7I2kAAAAAadaeYUHVVIZdgbl295s3zA==; incap_ses_69_2302070=C5++Ws3JAjwtKqjwqyP1ABtCI2kAAAAAz/Taasp4yj1dtwVdPqfSSA==; incap_ses_209_2302070=7ZTIHezK80FvW+VF24TmArdpI2kAAAAAHEjUTzwnd3LT6QaSDzyVLw==; reese84=3:tjzCIZn6jFpGC+HGJfBO6w==:TCADd7TtPfNx7si6spbT8Twcnm/WvdRuPmxHCW/NhmISOj3z+7Y9mmd9G6ajws0pP1kMGOCmjQxkMqLRPDUn5uPsIX874sQr4Kml0SkLZWeAKVnjK8NsWmqIUMQfAXwhwGw7b7BU/Wp5QEJseaFUAIl5BddHWqWTQu+U7O3AxY3yCSodl0TIuW9QUJ5Tmc+CEX3soTTDGF6Qp8aGUO/DYere5QiY28/F+iaI5bubl36Y8wyjj/4ETjaIIk56J3wY+cO/oFmTxqTXKO0FEFwkHeKDku7FhYT836/AOD/tpFgVso2SCxyUsL7Sy86i9dTkUTczkZoZYYT6raTaisLVajCSt3ASnNcFarjs4FE0z7YvVysCTEFkh2426Vq3GecnJ30ZaErTbVgL8A7IaqDdq8EW9FdH0g2NDqG3V0+y2Y9QXrS+wtflLCyOkBbp0lqMm95OqqFMZrahSLyaH259jd2Nf47LBi7GP+6JhTD+noeRhxAw2XPWDMYfX4CbousGPlCni3Bat2eFIS74fF1eCw==:6IWcKsbDDc8fh8gPH4UMq009M2lS87vMNMExLGmQ8VI=; incap_ses_208_2302070=cLzvaxaIznJcAeiyQPfiAt9qI2kAAAAApprpU+4ljfK21GYKjmdR5A==; incap_ses_1661_2302070=HWhNe59c6DCWep4xLA8NF+FqI2kAAAAAgqVDSrs2sibxqwTzqqkdUQ==; incap_ses_1662_2302070=kmvQUutEGzAfUsZ9r5wQF+dqI2kAAAAA359G6geYQ7M/qnl6Mei5jw==; incap_ses_1683_2302070=Qo02GV5aKTdjHnRUFThbF/tqI2kAAAAApS2R9vFcGxts+3ilJZ5cEg==; AMP_760524e2ba=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJoLTk5ZWVmYWQ1LTNhMmItNGYzZi04NjgwLWM2NTZhNjk5ZmY4NiUyMiUyQyUyMnVzZXJJZCUyMiUzQSUyMjM1OTU4NTk1MSUyMiUyQyUyMnNlc3Npb25JZCUyMiUzQTE3NjM5Mjg4MDczNDklMkMlMjJvcHRPdXQlMjIlM0FmYWxzZSUyQyUyMmxhc3RFdmVudFRpbWUlMjIlM0ExNzYzOTI4ODMwNjUxJTJDJTIybGFzdEV2ZW50SWQlMjIlM0E2NDQlMkMlMjJwYWdlQ291bnRlciUyMiUzQTAlN0Q='

scraper = HEBProductScraper(store_id='202', cookies=cookies)
client = get_client()

products_to_find = [
    {'id': '91ffefa3-70ff-469d-a21b-ce9f8243f810', 'name': 'Impossible Burger Patties Meat from Plants, 2 ct', 'search': 'Impossible Burger 2 ct'},
    {'id': '41d641ce-1f8f-4f96-b1b2-f98b7b05598e', 'name': 'H-E-B Mi Tienda Salado Botana Mixta Snack Mix, 7 oz', 'search': 'Mi Tienda Salado 7 oz'}
]

for product_info in products_to_find:
    product_id = product_info['id']
    product_name = product_info['name']
    search_term = product_info['search']
    
    print(f'\nSearching for: {product_name}')
    
    try:
        result = scraper.search_products(search_term)
        
        # Extract products from result
        if isinstance(result, dict):
            products = result.get('data', {}).get('products', [])
            if not products:
                products = result.get('products', [])
        else:
            products = result if isinstance(result, list) else []
        
        print(f'  Found {len(products)} products')
        
        found_match = None
        for prod in products[:10]:
            prod_name = str(prod.get('name', '')).lower()
            prod_id = prod.get('product_id') or prod.get('id')
            print(f'    - {prod.get("name", "Unknown")} (ID: {prod_id})')
            
            # Match logic
            if 'impossible' in product_name.lower():
                if 'impossible' in prod_name and 'burger' in prod_name and '2' in prod_name:
                    found_match = prod
                    break
            elif 'mi tienda' in product_name.lower():
                if 'mi tienda' in prod_name and 'salado' in prod_name and '7' in prod_name:
                    found_match = prod
                    break
        
        if found_match:
            store_item_id = str(found_match.get('product_id') or found_match.get('id'))
            print(f'  ✅ Found match! HEB ID: {store_item_id}')
            
            # Create mapping
            mapping = {
                'product_id': product_id,
                'store_name': 'heb',
                'store_item_id': store_item_id,
                'store_item_name': found_match.get('name', product_name),
                'is_active': True
            }
            
            try:
                client.table('product_store_mappings').insert(mapping).execute()
                print(f'  ✅ Created product_store_mapping')
            except Exception as e:
                print(f'  ❌ Error creating mapping: {e}')
        else:
            print(f'  ❌ No match found')
            
    except Exception as e:
        print(f'  ❌ Error: {e}')
        import traceback
        traceback.print_exc()

print('\nDone!')

