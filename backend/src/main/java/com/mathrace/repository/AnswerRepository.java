package com.mathrace.repository;

import com.mathrace.entity.Answer;
import com.mathrace.entity.RaceParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnswerRepository extends JpaRepository<Answer, Long> {
    List<Answer> findByRaceParticipant(RaceParticipant participant);
}
