-- Create database schema for crop price predictor

-- Districts table (normalized)
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Markets table (normalized)
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    district_id INTEGER REFERENCES districts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, district_id)
);

-- Commodities table (normalized)
CREATE TABLE commodities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50), -- e.g., 'grains', 'pulses', 'oilseeds'
    unit VARCHAR(20) DEFAULT 'Quintal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main crop prices table
CREATE TABLE crop_prices (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id),
    market_id INTEGER REFERENCES markets(id),
    commodity_id INTEGER REFERENCES commodities(id),
    min_price DECIMAL(10,2) NOT NULL,
    max_price DECIMAL(10,2) NOT NULL,
    modal_price DECIMAL(10,2) NOT NULL,
    price_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_crop_prices_date ON crop_prices(price_date);
CREATE INDEX idx_crop_prices_commodity ON crop_prices(commodity_id);
CREATE INDEX idx_crop_prices_market ON crop_prices(market_id);
CREATE INDEX idx_crop_prices_district ON crop_prices(district_id);
CREATE INDEX idx_crop_prices_commodity_date ON crop_prices(commodity_id, price_date);

-- Composite index for common queries
CREATE INDEX idx_crop_prices_lookup ON crop_prices(commodity_id, district_id, market_id, price_date);

-- Sample data insertion (based on your dataset)
INSERT INTO districts (name, state) VALUES 
('Belgaum', 'Karnataka');

INSERT INTO markets (name, district_id) VALUES 
('Athani', 1);

INSERT INTO commodities (name, category) VALUES 
('Soyabean', 'oilseeds');

-- Sample price data
INSERT INTO crop_prices (district_id, market_id, commodity_id, min_price, max_price, modal_price, price_date) VALUES
(1, 1, 1, 3000.00, 3500.00, 3500.00, '2018-09-01'),
(1, 1, 1, 3400.00, 3400.00, 3400.00, '2018-11-01'),
(1, 1, 1, 3500.00, 3500.00, 3500.00, '2018-09-01'),
(1, 1, 1, 4000.00, 4000.00, 4000.00, '2018-07-01'),
(1, 1, 1, 4000.00, 4000.00, 4000.00, '2020-05-01'),
(1, 1, 1, 6500.00, 6500.00, 6500.00, '2021-06-01');

-- View for easy querying with joined data
CREATE VIEW crop_prices_view AS
SELECT 
    cp.id,
    d.name AS district_name,
    m.name AS market_name,
    c.name AS commodity_name,
    c.category AS commodity_category,
    cp.min_price,
    cp.max_price,
    cp.modal_price,
    cp.price_date,
    cp.created_at
FROM crop_prices cp
JOIN districts d ON cp.district_id = d.id
JOIN markets m ON cp.market_id = m.id
JOIN commodities c ON cp.commodity_id = c.id;

-- Replace the existing function with this corrected version:
CREATE OR REPLACE FUNCTION get_price_trends(
    commodity_name VARCHAR,
    district_filter VARCHAR DEFAULT NULL,  -- Changed parameter name
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    price_date DATE,
    modal_price DECIMAL,
    min_price DECIMAL,
    max_price DECIMAL,
    market_name VARCHAR,
    district_name VARCHAR  -- Column alias name stays the same
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.price_date,
        cp.modal_price,
        cp.min_price,
        cp.max_price,
        m.name AS market_name,
        d.name AS district_name
    FROM crop_prices cp
    JOIN districts d ON cp.district_id = d.id
    JOIN markets m ON cp.market_id = m.id
    JOIN commodities c ON cp.commodity_id = c.id
    WHERE c.name = commodity_name
    AND (district_filter IS NULL OR d.name = district_filter)  -- Updated reference
    AND (start_date IS NULL OR cp.price_date >= start_date)
    AND (end_date IS NULL OR cp.price_date <= end_date)
    ORDER BY cp.price_date ASC;
END;
$$ LANGUAGE plpgsql;
