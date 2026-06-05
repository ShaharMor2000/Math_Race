package com.mathrace.service;

import com.mathrace.dto.race.CreateRaceRequest;
import com.mathrace.dto.race.CreateRaceResponse;
import com.mathrace.dto.race.FinalResultsResponse;
import com.mathrace.dto.race.JoinRaceRequest;
import com.mathrace.dto.race.JoinRaceResponse;
import com.mathrace.dto.race.OpenRaceRoomResponse;
import com.mathrace.dto.race.RoomSummaryResponse;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceResult;
import com.mathrace.entity.RaceRoom;
import com.mathrace.entity.Student;
import com.mathrace.entity.Teacher;
import com.mathrace.exception.ApiException;
import com.mathrace.model.enums.ParticipantStatus;
import com.mathrace.model.enums.RaceRoomStatus;
import com.mathrace.repository.RaceParticipantRepository;
import com.mathrace.repository.RaceResultRepository;
import com.mathrace.repository.RaceRoomRepository;
import com.mathrace.repository.StudentRepository;
import com.mathrace.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class RaceRoomService {

    private final RaceRoomRepository raceRoomRepository;
    private final RaceParticipantRepository raceParticipantRepository;
    private final RaceResultRepository raceResultRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final JwtService jwtService;
    private final SseEventPublisher sseEventPublisher;

    private static final List<String> CAR_COLORS = List.of(
        "red", "blue", "green", "yellow", "purple", "cyan", "orange", "pink"
    );

    @Transactional
    public CreateRaceResponse createRace(Long teacherId, CreateRaceRequest request) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new ApiException("TEACHER_NOT_FOUND", "Teacher not found"));

        RaceRoom room = new RaceRoom();
        room.setTeacher(teacher);
        room.setRoomCode(generateRoomCode());
        room.setTitle(request.title());
        room.setClassName(request.className());
        room.setMaxParticipants(request.maxParticipants());
        room.setQuestionTimeMs(request.questionTimeMs());
        room.setInitialDifficulty(request.initialDifficulty());
        room.setEnableLuckEvents(request.enableLuckEvents());
        room.setEnablePathChoice(request.enablePathChoice());
        room.setStatus(RaceRoomStatus.LOBBY);
        raceRoomRepository.save(room);

        return new CreateRaceResponse(room.getId(), room.getRoomCode(), room.getStatus());
    }

    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> listTeacherRooms(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new ApiException("TEACHER_NOT_FOUND", "Teacher not found"));

        return raceRoomRepository.findByTeacherOrderByCreatedAtDesc(teacher).stream()
            .map(room -> new RoomSummaryResponse(
                room.getId(),
                room.getRoomCode(),
                room.getTitle(),
                room.getStatus(),
                raceParticipantRepository.countByRaceRoom(room),
                room.getCreatedAt()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public RaceRoom getByRoomCodeOrThrow(String roomCode) {
        return raceRoomRepository.findByRoomCode(roomCode.toUpperCase(Locale.ROOT))
            .orElseThrow(() -> new ApiException("ROOM_NOT_FOUND", "Room not found"));
    }

    @Transactional
    public JoinRaceResponse joinRace(JoinRaceRequest request) {
        RaceRoom room = getByRoomCodeOrThrow(request.roomCode());
        if (room.getStatus() != RaceRoomStatus.LOBBY) {
            throw new ApiException("ROOM_CLOSED", "Room is not available");
        }

        long count = countRegisteredParticipants(room);
        if (count >= room.getMaxParticipants()) {
            throw new ApiException("ROOM_FULL", "Room is full");
        }

        Student student = new Student();
        student.setDisplayName(request.displayName());
        studentRepository.save(student);

        RaceParticipant participant = new RaceParticipant();
        participant.setRaceRoom(room);
        participant.setStudent(student);
        participant.setParticipantStatus(ParticipantStatus.PENDING);
        participant.setLaneNo(nextLane(room));
        participant.setCarColor(CAR_COLORS.get(Math.max(0, participant.getLaneNo() - 1)));
        raceParticipantRepository.save(participant);

        String studentToken = jwtService.issueStudentToken(participant.getId(), room.getId());
        sseEventPublisher.publish(room.getRoomCode(), "registration_requested", java.util.Map.of(
            "participantId", participant.getId(),
            "displayName", student.getDisplayName(),
            "laneNo", participant.getLaneNo()
        ));
        return new JoinRaceResponse(
            studentToken,
            new JoinRaceResponse.StudentData(student.getId(), student.getDisplayName()),
            new JoinRaceResponse.ParticipantData(participant.getId(), participant.getLaneNo(), participant.getCarColor(), participant.getParticipantStatus()),
            new JoinRaceResponse.RoomData(room.getRoomCode(), room.getStatus())
        );
    }

    @Transactional(readOnly = true)
    public List<OpenRaceRoomResponse> listOpenRaces() {
        return raceRoomRepository.findByStatusOrderByCreatedAtDesc(RaceRoomStatus.LOBBY).stream()
            .map(room -> {
                long registered = countRegisteredParticipants(room);
                return new OpenRaceRoomResponse(
                    room.getRoomCode(),
                    room.getTitle(),
                    room.getClassName(),
                    registered,
                    room.getMaxParticipants()
                );
            })
            .filter(r -> r.registeredCount() < r.maxParticipants())
            .toList();
    }

    @Transactional
    public RaceParticipant approveParticipant(String roomCode, Long participantId) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantInRoomOrThrow(room, participantId);
        if (participant.getParticipantStatus() != ParticipantStatus.PENDING) {
            throw new ApiException("PARTICIPANT_NOT_PENDING", "Participant is not pending");
        }
        long activeCount = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.ACTIVE);
        if (activeCount >= room.getMaxParticipants()) {
            throw new ApiException("ROOM_FULL", "Room is full");
        }
        participant.setParticipantStatus(ParticipantStatus.ACTIVE);
        raceParticipantRepository.save(participant);
        sseEventPublisher.publish(room.getRoomCode(), "registration_approved", java.util.Map.of(
            "participantId", participant.getId(),
            "displayName", participant.getStudent().getDisplayName()
        ));
        return participant;
    }

    @Transactional
    public void rejectParticipant(String roomCode, Long participantId) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantInRoomOrThrow(room, participantId);
        String displayName = participant.getStudent().getDisplayName();
        raceParticipantRepository.delete(participant);
        sseEventPublisher.publish(room.getRoomCode(), "registration_rejected", java.util.Map.of(
            "participantId", participantId,
            "displayName", displayName
        ));
    }

    @Transactional
    public RaceRoom startRace(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        if (room.getStatus() != RaceRoomStatus.LOBBY) {
            throw new ApiException("ROOM_NOT_IN_LOBBY", "Race can start only from lobby");
        }
        long activeCount = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.ACTIVE);
        if (activeCount < 1) {
            throw new ApiException("NO_APPROVED_PARTICIPANTS", "No approved participants");
        }
        room.setStatus(RaceRoomStatus.RUNNING);
        room.setStartAt(LocalDateTime.now());
        return room;
    }

    @Transactional
    public RaceRoom endRace(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        room.setStatus(RaceRoomStatus.FINISHED);
        room.setFinishAt(LocalDateTime.now());
        return room;
    }

    @Transactional(readOnly = true)
    public List<RaceParticipant> getRoomParticipants(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        return raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room);
    }

    @Transactional(readOnly = true)
    public FinalResultsResponse getFinalResults(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        List<RaceResult> rows = raceResultRepository.findByRaceRoomOrderByFinalRankAsc(room);
        List<FinalResultsResponse.ResultRow> leaderboard = rows.stream()
            .map(r -> new FinalResultsResponse.ResultRow(
                r.getFinalRank(),
                r.getRaceParticipant().getStudent().getDisplayName(),
                r.getFinalProgress(),
                r.getFinalScore(),
                r.getAccuracyPct()
            ))
            .toList();
        return new FinalResultsResponse(room.getRoomCode(), room.getWinnerParticipantId(), leaderboard);
    }

    private int nextLane(RaceRoom room) {
        List<Integer> used = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room)
            .stream()
            .map(RaceParticipant::getLaneNo)
            .toList();
        return IntStream.rangeClosed(1, room.getMaxParticipants())
            .filter(i -> !used.contains(i))
            .findFirst()
            .orElseThrow(() -> new ApiException("NO_LANE_AVAILABLE", "No lane available"));
    }

    private String generateRoomCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private RaceParticipant getParticipantInRoomOrThrow(RaceRoom room, Long participantId) {
        RaceParticipant participant = raceParticipantRepository.findById(participantId)
            .orElseThrow(() -> new ApiException("PARTICIPANT_NOT_FOUND", "Participant not found"));
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room");
        }
        return participant;
    }

    private long countRegisteredParticipants(RaceRoom room) {
        return raceParticipantRepository.countByRaceRoomAndParticipantStatusIn(
            room,
            List.of(ParticipantStatus.PENDING, ParticipantStatus.ACTIVE)
        );
    }
}
