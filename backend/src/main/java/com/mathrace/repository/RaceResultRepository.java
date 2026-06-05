package com.mathrace.repository;

import com.mathrace.entity.RaceResult;
import com.mathrace.entity.RaceRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RaceResultRepository extends JpaRepository<RaceResult, Long> {
    List<RaceResult> findByRaceRoomOrderByFinalRankAsc(RaceRoom room);
}
