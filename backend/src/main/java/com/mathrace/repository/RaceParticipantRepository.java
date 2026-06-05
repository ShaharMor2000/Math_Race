package com.mathrace.repository;

import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.entity.Student;
import com.mathrace.model.enums.ParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RaceParticipantRepository extends JpaRepository<RaceParticipant, Long> {
    List<RaceParticipant> findByRaceRoomOrderByProgressPointsDesc(RaceRoom room);
    long countByRaceRoom(RaceRoom room);
    long countByRaceRoomAndParticipantStatus(RaceRoom room, ParticipantStatus status);
    long countByRaceRoomAndParticipantStatusIn(RaceRoom room, List<ParticipantStatus> statuses);
    Optional<RaceParticipant> findByRaceRoomAndStudent(RaceRoom room, Student student);
}
