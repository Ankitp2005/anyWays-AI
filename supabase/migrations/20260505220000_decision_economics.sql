-- =============================================================================
-- Cost-Aware Decision Economics
-- =============================================================================

-- 1. Create decision_costs table
CREATE TABLE IF NOT EXISTS public.decision_costs (
    scenario TEXT PRIMARY KEY,
    cost_value FLOAT NOT NULL,
    description TEXT
);

-- Seed initial economics
INSERT INTO public.decision_costs (scenario, cost_value, description)
VALUES 
    ('FALSE_POSITIVE', 100.0, 'Cost of attempting delivery to a closed place (wasted driver time, gas)'),
    ('FALSE_NEGATIVE', 20.0, 'Opportunity cost of skipping an open place'),
    ('DELIVERY_PROFIT', 30.0, 'Profit from a successful delivery')
ON CONFLICT (scenario) DO UPDATE 
SET cost_value = EXCLUDED.cost_value;

-- 2. Create RPC for Expected Value Calculation
CREATE OR REPLACE FUNCTION public.get_business_decision(p_success_probability FLOAT)
RETURNS JSONB AS $$
DECLARE
    v_fp_cost FLOAT;
    v_fn_cost FLOAT;
    v_profit FLOAT;
    v_expected_value FLOAT;
    v_action TEXT;
    v_reasoning TEXT;
BEGIN
    -- Fetch economics
    SELECT cost_value INTO v_fp_cost FROM public.decision_costs WHERE scenario = 'FALSE_POSITIVE';
    SELECT cost_value INTO v_fn_cost FROM public.decision_costs WHERE scenario = 'FALSE_NEGATIVE';
    SELECT cost_value INTO v_profit FROM public.decision_costs WHERE scenario = 'DELIVERY_PROFIT';
    
    -- Fallbacks
    IF v_fp_cost IS NULL THEN v_fp_cost := 100.0; END IF;
    IF v_profit IS NULL THEN v_profit := 30.0; END IF;

    -- Calculate Expected Value
    -- EV = (Probability of Success * Profit) - (Probability of Failure * False Positive Cost)
    v_expected_value := (p_success_probability * v_profit) - ((1.0 - p_success_probability) * v_fp_cost);

    -- Decision Rules
    IF v_expected_value > 10.0 THEN
        v_action := 'DELIVER';
        v_reasoning := 'High confidence, low risk. Expected profit is solid.';
    ELSIF v_expected_value > 0.0 THEN
        v_action := 'RETRY';
        v_reasoning := 'Medium uncertainty. Barely profitable expected value; suggest requesting more signals or manual confirmation.';
    ELSE
        v_action := 'SKIP';
        v_reasoning := 'Negative expected value. Risk of wasted delivery cost outweighs potential profit.';
    END IF;

    RETURN jsonb_build_object(
        'expected_value', ROUND(v_expected_value::NUMERIC, 2),
        'recommended_action', v_action,
        'reasoning', v_reasoning
    );
END;
$$ LANGUAGE plpgsql STABLE;
