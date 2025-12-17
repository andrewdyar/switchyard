#!/usr/bin/env python3
"""
Generate markdown tree structure for Goods Master Categories from Supabase data.
"""
import json
from collections import defaultdict

def build_category_tree(data):
    """Build hierarchical tree from SQL query results."""
    tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    
    for row in data:
        l1 = row.get('l1_name')
        l2 = row.get('l2_name')
        l3 = row.get('l3_name')
        l4 = row.get('l4_name')
        
        if not l1:
            continue
            
        if l2:
            if l3:
                if l4:
                    # Add level 4 category
                    if l4 not in tree[l1][l2][l3]:
                        tree[l1][l2][l3].append(l4)
                else:
                    # Level 3 category with no level 4 children
                    if l3 not in tree[l1][l2]:
                        tree[l1][l2][l3] = []
            else:
                # Level 2 category with no level 3 children
                if l2 not in tree[l1]:
                    tree[l1][l2] = {}
    
    return tree

def format_tree_markdown(tree):
    """Format tree dictionary into markdown tree structure."""
    lines = []
    l1_sorted = sorted(tree.keys())
    
    for l1_idx, l1 in enumerate(l1_sorted, 1):
        lines.append(f"{l1_idx}. {l1}")
        
        l2_sorted = sorted(tree[l1].keys())
        for l2_idx, l2 in enumerate(l2_sorted):
            is_last_l2 = (l2_idx == len(l2_sorted) - 1)
            connector = "   └──" if is_last_l2 else "   ├──"
            lines.append(f"{connector} {l2}")
            
            l3_sorted = sorted(tree[l1][l2].keys())
            for l3_idx, l3 in enumerate(l3_sorted):
                is_last_l3 = (l3_idx == len(l3_sorted) - 1)
                
                # Determine prefix based on position
                if is_last_l2:
                    l3_prefix = "      "
                else:
                    l3_prefix = "   │  "
                
                l3_connector = "└──" if is_last_l3 else "├──"
                lines.append(f"{l3_prefix}{l3_connector} {l3}")
                
                # Add level 4 categories if they exist
                l4_items = tree[l1][l2][l3]
                if isinstance(l4_items, list) and l4_items:
                    l4_sorted = sorted([item for item in l4_items if item])
                    for l4_idx, l4 in enumerate(l4_sorted):
                        is_last_l4 = (l4_idx == len(l4_sorted) - 1)
                        
                        # Determine prefix for level 4
                        if is_last_l2 and is_last_l3:
                            l4_prefix = "         "
                        elif is_last_l2:
                            l4_prefix = "   │     "
                        elif is_last_l3:
                            l4_prefix = "      │  "
                        else:
                            l4_prefix = "   │  │  "
                        
                        l4_connector = "└──" if is_last_l4 else "├──"
                        lines.append(f"{l4_prefix}{l4_connector} {l4}")
        
        # Add blank line between top-level categories (except after last one)
        if l1_idx < len(l1_sorted):
            lines.append("")
    
    return "\n".join(lines)

if __name__ == "__main__":
    # This script will be called with the SQL query results
    # For now, it's a template
    print("Category tree formatter ready")

