package com.mathrace.repository;

import com.mathrace.entity.RaceRoom;
import com.mathrace.entity.Teacher;
import com.mathrace.model.enums.RaceRoomStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RaceRoomRepository extends JpaRepository<RaceRoom, Long> {
    @EntityGraph(attributePaths = "teacher")
    Optional<RaceRoom> findByRoomCode(String roomCode);

    List<RaceRoom> findByTeacherOrderByCreatedAtDesc(Teacher teacher);
    List<RaceRoom> findByStatusOrderByCreatedAtDesc(RaceRoomStatus status);

    List<RaceRoom> findByStatusInOrderByCreatedAtDesc(List<RaceRoomStatus> statuses);
}
