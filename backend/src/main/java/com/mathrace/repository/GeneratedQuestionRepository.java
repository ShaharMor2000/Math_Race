package com.mathrace.repository;

import com.mathrace.entity.GeneratedQuestion;
import com.mathrace.entity.RaceParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GeneratedQuestionRepository extends JpaRepository<GeneratedQuestion, Long> {
    Optional<GeneratedQuestion> findFirstByRaceParticipantAndIsAnsweredFalseOrderByPresentedAtDesc(RaceParticipant participant);

    List<GeneratedQuestion> findByRaceParticipantAndIsAnsweredFalse(RaceParticipant participant);
}
