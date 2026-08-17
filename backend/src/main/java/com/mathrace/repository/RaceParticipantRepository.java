package com.mathrace.repository;

import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.entity.Student;
import com.mathrace.model.enums.ParticipantStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RaceParticipantRepository extends JpaRepository<RaceParticipant, Long> {
    @EntityGraph(attributePaths = {"student", "raceRoom"})
    @Query("select p from RaceParticipant p where p.id = :id")
    Optional<RaceParticipant> findDetailedById(@Param("id") Long id);

    @EntityGraph(attributePaths = "student")
    List<RaceParticipant> findByRaceRoomOrderByProgressPointsDesc(RaceRoom room);

    @Query("""
        select p
        from RaceParticipant p
        join fetch p.student s
        join fetch p.raceRoom r
        where lower(s.email) = lower(:email)
        order by p.createdAt desc
        """)
    List<RaceParticipant> findStudentRaceSummaries(@Param("email") String email);

    long countByRaceRoom(RaceRoom room);
    long countByRaceRoomAndParticipantStatus(RaceRoom room, ParticipantStatus status);
    long countByRaceRoomAndParticipantStatusIn(RaceRoom room, List<ParticipantStatus> statuses);
    Optional<RaceParticipant> findByRaceRoomAndStudent(RaceRoom room, Student student);

    @EntityGraph(attributePaths = "student")
    Optional<RaceParticipant> findByRaceRoomAndStudent_EmailIgnoreCase(RaceRoom room, String email);
}
