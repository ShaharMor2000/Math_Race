package com.mathrace.repository;

import com.mathrace.entity.GameEvent;
import com.mathrace.entity.RaceRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameEventRepository extends JpaRepository<GameEvent, Long> {
    List<GameEvent> findTop50ByRaceRoomOrderByCreatedAtDesc(RaceRoom raceRoom);
}
