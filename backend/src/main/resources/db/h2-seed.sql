INSERT INTO question_templates
  (template_code, topic, difficulty, expression_pattern, min_operand, max_operand, allow_negative, estimated_time_ms, is_active, created_at, updated_at)
SELECT 'ADD_EASY_A', 'ADDITION', 'EASY', '{a} + {b}', 1, 20, false, 12000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM question_templates WHERE template_code = 'ADD_EASY_A');

INSERT INTO question_templates
  (template_code, topic, difficulty, expression_pattern, min_operand, max_operand, allow_negative, estimated_time_ms, is_active, created_at, updated_at)
SELECT 'SUB_EASY_A', 'SUBTRACTION', 'EASY', '{a} - {b}', 1, 20, false, 12000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM question_templates WHERE template_code = 'SUB_EASY_A');

INSERT INTO question_templates
  (template_code, topic, difficulty, expression_pattern, min_operand, max_operand, allow_negative, estimated_time_ms, is_active, created_at, updated_at)
SELECT 'MUL_MED_A', 'MULTIPLICATION', 'MEDIUM', '{a} x {b}', 2, 12, false, 15000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM question_templates WHERE template_code = 'MUL_MED_A');

INSERT INTO question_templates
  (template_code, topic, difficulty, expression_pattern, min_operand, max_operand, allow_negative, estimated_time_ms, is_active, created_at, updated_at)
SELECT 'DIV_MED_A', 'DIVISION', 'MEDIUM', '{a} / {b}', 2, 12, false, 18000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM question_templates WHERE template_code = 'DIV_MED_A');

INSERT INTO question_templates
  (template_code, topic, difficulty, expression_pattern, min_operand, max_operand, allow_negative, estimated_time_ms, is_active, created_at, updated_at)
SELECT 'MIX_HARD_A', 'MIXED', 'HARD', '({a} x {b}) + {c}', 3, 25, false, 20000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM question_templates WHERE template_code = 'MIX_HARD_A');
