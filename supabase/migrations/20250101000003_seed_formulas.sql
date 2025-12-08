-- ═══════════════════════════════════════════════════════════════════════════════
-- FlowTrade QuoteFlow AI - Seed Trade Formula Templates
-- System-level templates for HVAC, Electrical, and Plumbing trades
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- HVAC FORMULAS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO formula_templates (trade, category, name, description, inputs, formula, outputs, labor_rate_per_hour, typical_hours_min, typical_hours_max, is_system, org_id)
VALUES (
    'hvac',
    'sizing',
    'Residential Cooling Load',
    'Calculate required cooling capacity for residential spaces using simplified Manual J method',
    '[
        {"name": "floor_area_sqm", "type": "number", "unit": "m²", "label": "Floor Area", "required": true},
        {"name": "ceiling_height_m", "type": "number", "unit": "m", "label": "Ceiling Height", "default": 2.7},
        {"name": "num_occupants", "type": "number", "label": "Number of Occupants", "default": 2},
        {"name": "window_area_sqm", "type": "number", "unit": "m²", "label": "Window Area", "default": 5},
        {"name": "insulation_rating", "type": "select", "options": ["poor", "average", "good", "excellent"], "default": "average"},
        {"name": "climate_zone", "type": "select", "options": ["tropical", "subtropical", "temperate", "cool"], "default": "temperate"}
    ]'::jsonb,
    '{
        "type": "composite",
        "steps": [
            {"name": "base_load", "calc": "floor_area_sqm * 150"},
            {"name": "occupant_load", "calc": "num_occupants * 400"},
            {"name": "window_load", "calc": "window_area_sqm * 800"},
            {"name": "insulation_factor", "lookup": {"poor": 1.3, "average": 1.0, "good": 0.85, "excellent": 0.7}},
            {"name": "climate_factor", "lookup": {"tropical": 1.4, "subtropical": 1.2, "temperate": 1.0, "cool": 0.8}},
            {"name": "total_watts", "calc": "(base_load + occupant_load + window_load) * insulation_factor * climate_factor"},
            {"name": "capacity_kw", "calc": "total_watts / 1000"}
        ]
    }'::jsonb,
    '[
        {"name": "capacity_kw", "unit": "kW", "label": "Required Cooling Capacity"},
        {"name": "recommended_size", "unit": "kW", "label": "Recommended Unit Size", "round_up_to": [2.5, 3.5, 5.0, 7.0, 8.5, 10.0, 12.5, 14.0]}
    ]'::jsonb,
    85.00,
    4,
    8,
    TRUE,
    NULL
);

INSERT INTO formula_templates (trade, category, name, description, inputs, formula, outputs, labor_rate_per_hour, typical_hours_min, typical_hours_max, is_system, org_id)
VALUES (
    'hvac',
    'installation',
    'Split System Installation',
    'Standard template for split system air conditioner installation',
    '[
        {"name": "unit_capacity_kw", "type": "number", "unit": "kW", "label": "Unit Capacity", "required": true},
        {"name": "pipe_run_meters", "type": "number", "unit": "m", "label": "Pipe Run Length", "default": 5},
        {"name": "is_back_to_back", "type": "boolean", "label": "Back-to-Back Install", "default": false},
        {"name": "requires_new_circuit", "type": "boolean", "label": "New Electrical Circuit Required", "default": true}
    ]'::jsonb,
    '{
        "type": "template",
        "line_items": [
            {"type": "equipment", "description": "Split System Unit", "quantity": 1},
            {"type": "material", "description": "Copper Pipe Set", "quantity_field": "pipe_run_meters"},
            {"type": "material", "description": "Electrical Cable & Isolator", "quantity": 1},
            {"type": "material", "description": "Wall Bracket & Hardware", "quantity": 1},
            {"type": "labor", "description": "Installation Labor", "hours_calc": "is_back_to_back ? 4 : 6"}
        ]
    }'::jsonb,
    '[
        {"name": "estimated_hours", "unit": "hours", "label": "Estimated Labor Hours"},
        {"name": "material_list", "type": "array", "label": "Required Materials"}
    ]'::jsonb,
    85.00,
    4,
    8,
    TRUE,
    NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ELECTRICAL FORMULAS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO formula_templates (trade, category, name, description, inputs, formula, outputs, labor_rate_per_hour, typical_hours_min, typical_hours_max, is_system, org_id)
VALUES (
    'electrical',
    'sizing',
    'Residential Electrical Load',
    'Calculate total electrical load and recommended supply capacity',
    '[
        {"name": "floor_area_sqm", "type": "number", "unit": "m²", "label": "Floor Area", "required": true},
        {"name": "num_circuits_power", "type": "number", "label": "Power Circuits", "default": 4},
        {"name": "has_electric_stove", "type": "boolean", "label": "Electric Stove/Oven", "default": false},
        {"name": "has_electric_hot_water", "type": "boolean", "label": "Electric Hot Water", "default": false},
        {"name": "ac_capacity_kw", "type": "number", "unit": "kW", "label": "A/C Capacity", "default": 0},
        {"name": "has_ev_charger", "type": "boolean", "label": "EV Charger", "default": false},
        {"name": "ev_charger_amps", "type": "number", "unit": "A", "label": "EV Charger Amps", "default": 32}
    ]'::jsonb,
    '{
        "type": "composite",
        "steps": [
            {"name": "lighting_load", "calc": "floor_area_sqm * 10"},
            {"name": "power_circuits_load", "calc": "num_circuits_power * 2400 * 0.4"},
            {"name": "stove_load", "calc": "has_electric_stove ? 8000 : 0"},
            {"name": "hot_water_load", "calc": "has_electric_hot_water ? 3600 : 0"},
            {"name": "ac_load", "calc": "ac_capacity_kw * 1000"},
            {"name": "ev_load", "calc": "has_ev_charger ? ev_charger_amps * 240 : 0"},
            {"name": "total_load_watts", "calc": "lighting_load + power_circuits_load + stove_load + hot_water_load + ac_load + ev_load"},
            {"name": "diversity_factor", "value": 0.6},
            {"name": "max_demand_watts", "calc": "total_load_watts * diversity_factor"},
            {"name": "required_amps", "calc": "max_demand_watts / 240"}
        ]
    }'::jsonb,
    '[
        {"name": "total_load_watts", "unit": "W", "label": "Total Connected Load"},
        {"name": "max_demand_watts", "unit": "W", "label": "Maximum Demand"},
        {"name": "required_amps", "unit": "A", "label": "Required Supply Capacity"},
        {"name": "recommended_supply", "unit": "A", "label": "Recommended Main Switch", "round_up_to": [40, 63, 80, 100, 125]}
    ]'::jsonb,
    95.00,
    2,
    6,
    TRUE,
    NULL
);

INSERT INTO formula_templates (trade, category, name, description, inputs, formula, outputs, labor_rate_per_hour, typical_hours_min, typical_hours_max, is_system, org_id)
VALUES (
    'electrical',
    'installation',
    'Power Point Installation',
    'Standard template for GPO (power point) installation',
    '[
        {"name": "num_points", "type": "number", "label": "Number of Power Points", "required": true},
        {"name": "cable_run_meters", "type": "number", "unit": "m", "label": "Total Cable Run", "default": 15},
        {"name": "new_circuits", "type": "number", "label": "New Circuits Required", "default": 0},
        {"name": "is_existing_wall", "type": "boolean", "label": "Existing Wall (not new construction)", "default": true}
    ]'::jsonb,
    '{
        "type": "template",
        "line_items": [
            {"type": "material", "description": "Double Power Point (GPO)", "quantity_field": "num_points"},
            {"type": "material", "description": "2.5mm² TPS Cable", "quantity_field": "cable_run_meters"},
            {"type": "material", "description": "Circuit Breaker", "quantity_field": "new_circuits"},
            {"type": "labor", "description": "Electrical Installation", "hours_calc": "num_points * 0.75 + new_circuits * 1.5"},
            {"type": "other", "description": "Certificate of Compliance", "quantity": 1}
        ]
    }'::jsonb,
    '[
        {"name": "estimated_hours", "unit": "hours", "label": "Estimated Labor Hours"},
        {"name": "material_list", "type": "array", "label": "Required Materials"}
    ]'::jsonb,
    95.00,
    1,
    4,
    TRUE,
    NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PLUMBING FORMULAS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO formula_templates (trade, category, name, description, inputs, formula, outputs, labor_rate_per_hour, typical_hours_min, typical_hours_max, is_system, org_id)
VALUES (
    'plumbing',
    'sizing',
    'Fixture Unit Calculation',
    'Calculate total fixture units for pipe sizing',
    '[
        {"name": "num_toilets", "type": "number", "label": "Toilets", "default": 1, "fixture_units": 4},
        {"name": "num_basins", "type": "number", "label": "Hand Basins", "default": 1, "fixture_units": 1},
        {"name": "num_showers", "type": "number", "label": "Showers", "default": 1, "fixture_units": 2},
        {"name": "num_baths", "type": "number", "label": "Bathtubs", "default": 0, "fixture_units": 3},
        {"name": "num_kitchen_sinks", "type": "number", "label": "Kitchen Sinks", "default": 1, "fixture_units": 2},
        {"name": "num_laundry_tubs", "type": "number", "label": "Laundry Tubs", "default": 1, "fixture_units": 2},
        {"name": "num_washing_machines", "type": "number", "label": "Washing Machines", "default": 1, "fixture_units": 2},
        {"name": "num_dishwashers", "type": "number", "label": "Dishwashers", "default": 1, "fixture_units": 2}
    ]'::jsonb,
    '{
        "type": "sum",
        "items": [
            {"calc": "num_toilets * 4"},
            {"calc": "num_basins * 1"},
            {"calc": "num_showers * 2"},
            {"calc": "num_baths * 3"},
            {"calc": "num_kitchen_sinks * 2"},
            {"calc": "num_laundry_tubs * 2"},
            {"calc": "num_washing_machines * 2"},
            {"calc": "num_dishwashers * 2"}
        ]
    }'::jsonb,
    '[
        {"name": "total_fixture_units", "unit": "FU", "label": "Total Fixture Units"},
        {"name": "recommended_water_main", "unit": "mm", "label": "Water Main Size", "lookup_table": {"1-10": 20, "11-30": 25, "31-60": 32, "61-100": 40}}
    ]'::jsonb,
    90.00,
    2,
    8,
    TRUE,
    NULL
);

INSERT INTO formula_templates (trade, category, name, description, inputs, formula, outputs, labor_rate_per_hour, typical_hours_min, typical_hours_max, is_system, org_id)
VALUES (
    'plumbing',
    'installation',
    'Hot Water System Installation',
    'Standard template for hot water system installation',
    '[
        {"name": "system_type", "type": "select", "options": ["electric_storage", "gas_storage", "gas_instant", "heat_pump", "solar"], "label": "System Type", "required": true},
        {"name": "capacity_litres", "type": "number", "unit": "L", "label": "Tank Capacity", "default": 250},
        {"name": "location", "type": "select", "options": ["internal", "external", "roof"], "label": "Installation Location", "default": "external"},
        {"name": "is_replacement", "type": "boolean", "label": "Replacing Existing System", "default": true},
        {"name": "pipe_run_meters", "type": "number", "unit": "m", "label": "Pipe Run (if relocating)", "default": 0}
    ]'::jsonb,
    '{
        "type": "template",
        "line_items": [
            {"type": "equipment", "description": "Hot Water System", "quantity": 1, "price_varies_by": "system_type"},
            {"type": "labor", "description": "Removal of Existing System", "quantity": 1, "condition": "is_replacement"},
            {"type": "material", "description": "Isolation Valves & Fittings", "quantity": 1},
            {"type": "material", "description": "T&P Relief Valve & Drain", "quantity": 1},
            {"type": "labor", "description": "Installation Labor", "hours_calc": "4 + (pipe_run_meters * 0.5)"},
            {"type": "other", "description": "Compliance Certificate", "quantity": 1}
        ]
    }'::jsonb,
    '[
        {"name": "estimated_hours", "unit": "hours", "label": "Estimated Labor Hours"},
        {"name": "material_list", "type": "array", "label": "Required Materials"}
    ]'::jsonb,
    90.00,
    3,
    6,
    TRUE,
    NULL
);
