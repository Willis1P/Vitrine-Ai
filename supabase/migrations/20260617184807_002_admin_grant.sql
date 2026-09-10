-- ============================================
-- ADMIN RPC FUNCTIONS (SECURITY DEFINER)
-- Permitem ao admin conceder créditos e ativar
-- planos por email sem expor service_role key.
-- ============================================

-- Activate "Vitalicio" plan for a user by email
CREATE OR REPLACE FUNCTION admin_activate_vitalicio(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_plan_id uuid;
  v_credits integer;
  v_expires timestamptz;
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta ação';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com email %', p_email;
  END IF;

  SELECT id, credits INTO v_plan_id, v_credits
  FROM plans
  WHERE slug = 'vitalicio' AND is_active = true
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano vitalicio não encontrado';
  END IF;

  -- Mark previous subscriptions as cancelled
  UPDATE user_subscriptions
  SET status = 'cancelled'
  WHERE user_id = v_user_id AND status = 'active';

  -- Create new vitallic subscription (no expiry)
  INSERT INTO user_subscriptions (user_id, plan_id, credits_remaining, credits_used, started_at, expires_at, status)
  VALUES (v_user_id, v_plan_id, v_credits, 0, now(), NULL, 'active');

  -- Add the plan credits as purchase
  INSERT INTO credit_transactions (user_id, amount, type, description, reference_type, reference_id)
  VALUES (v_user_id, v_credits, 'purchase', 'Plano Vitalício (admin)', 'plan', v_plan_id);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'plan', 'vitalicio',
    'credits_added', v_credits
  );
END;
$$;

-- Add arbitrary credits to a user by email
CREATE OR REPLACE FUNCTION admin_add_credits(p_email text, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta ação';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Quantidade de créditos deve ser maior que zero';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado com email %', p_email;
  END IF;

  INSERT INTO credit_transactions (user_id, amount, type, description, reference_type)
  VALUES (v_user_id, p_amount, 'bonus', 'Créditos adicionados (admin)', 'payment');

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'credits_added', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_activate_vitalicio(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_credits(text, integer) TO authenticated;