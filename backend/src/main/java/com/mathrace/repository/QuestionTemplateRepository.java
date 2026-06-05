package com.mathrace.repository;

import com.mathrace.entity.QuestionTemplate;
import com.mathrace.model.enums.DifficultyLevel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionTemplateRepository extends JpaRepository<QuestionTemplate, Long> {
    List<QuestionTemplate> findByDifficultyAndIsActiveTrue(DifficultyLevel difficulty);
}
