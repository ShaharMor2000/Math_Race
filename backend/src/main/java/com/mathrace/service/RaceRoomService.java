package com.mathrace.service;

import com.mathrace.dto.race.AddStudentRequest;
import com.mathrace.dto.race.CreateRaceRequest;
import com.mathrace.dto.race.CreateRaceResponse;
import com.mathrace.dto.race.FinalResultsResponse;
import com.mathrace.dto.race.JoinRaceRequest;
import com.mathrace.dto.race.JoinRaceResponse;
import com.mathrace.dto.race.OpenRaceRoomResponse;
import com.mathrace.dto.race.RoomDetailsResponse;
import com.mathrace.dto.race.RoomSummaryResponse;
import com.mathrace.dto.race.StudentRaceSummaryResponse;
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
            .orElseThrow(() -> new ApiException("TEACHER_NOT_FOUND", "המורה לא נמצא"));

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
        room.setRaceDurationMinutes(request.raceDurationMinutes());
        room.setStatus(RaceRoomStatus.LOBBY);
        raceRoomRepository.save(room);

        return new CreateRaceResponse(room.getId(), room.getRoomCode(), room.getStatus());
    }

    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> listTeacherRooms(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
            .orElseThrow(() -> new ApiException("TEACHER_NOT_FOUND", "המורה לא נמצא"));

        return raceRoomRepository.findByTeacherAndArchivedAtIsNullOrderByCreatedAtDesc(teacher).stream()
            .map(room -> {
                long pending = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.PENDING);
                long approved = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.ACTIVE);
                long finished = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.FINISHED);
                boolean ended = room.getStatus() == RaceRoomStatus.FINISHED
                    || room.getStatus() == RaceRoomStatus.CANCELLED;
                long participants = ended ? finished + approved : pending + approved;
                return new RoomSummaryResponse(
                    room.getId(),
                    room.getRoomCode(),
                    room.getTitle(),
                    room.getStatus(),
                    participants,
                    pending,
                    approved,
                    room.getCreatedAt()
                );
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public RaceRoom getByRoomCodeOrThrow(String roomCode) {
        return raceRoomRepository.findByRoomCodeAndArchivedAtIsNull(roomCode.trim().toUpperCase(Locale.ROOT))
            .orElseThrow(() -> new ApiException("ROOM_NOT_FOUND", "החדר לא נמצא"));
    }

    @Transactional
    public RaceRoom archiveRace(Long teacherId, String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        if (room.getStatus() == RaceRoomStatus.RUNNING) {
            throw new ApiException("ROOM_RUNNING", "לא ניתן להסיר מירוץ שרץ כרגע");
        }
        room.setArchivedAt(LocalDateTime.now());
        return raceRoomRepository.save(room);
    }

    @Transactional(readOnly = true)
    public void ensureTeacherOwnsRoom(Long teacherId, RaceRoom room) {
        if (!room.getTeacher().getId().equals(teacherId)) {
            throw new ApiException("FORBIDDEN", "המורה אינו בעל החדר");
        }
    }

    @Transactional
    public JoinRaceResponse joinRace(JoinRaceRequest request) {
        RaceRoom room = getByRoomCodeOrThrow(request.roomCode());
        String normalizedEmail = resolveStudentEmail(request.email());

        RaceParticipant existingParticipant = raceParticipantRepository
            .findByRaceRoomAndStudent_EmailIgnoreCase(room, normalizedEmail)
            .orElse(null);
        if (existingParticipant != null) {
            if (existingParticipant.getParticipantStatus() == ParticipantStatus.LEFT
                && (room.getStatus() == RaceRoomStatus.LOBBY || room.getStatus() == RaceRoomStatus.LOCKED)) {
                if (countRegisteredParticipants(room) >= room.getMaxParticipants()) {
                    throw new ApiException("ROOM_FULL", "החדר מלא");
                }
                existingParticipant.setParticipantStatus(ParticipantStatus.PENDING);
                if (request.displayName() != null && !request.displayName().isBlank()) {
                    existingParticipant.getStudent().setDisplayName(request.displayName().trim());
                }
                raceParticipantRepository.save(existingParticipant);
                maybeLockRoom(room);
                String studentToken = jwtService.issueStudentToken(existingParticipant.getId(), room.getId());
                Student student = existingParticipant.getStudent();
                sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_requested", java.util.Map.of(
                    "participantId", existingParticipant.getId(),
                    "displayName", student.getDisplayName(),
                    "laneNo", existingParticipant.getLaneNo()
                ));
                return new JoinRaceResponse(
                    studentToken,
                    new JoinRaceResponse.StudentData(student.getId(), student.getDisplayName()),
                    new JoinRaceResponse.ParticipantData(
                        existingParticipant.getId(),
                        existingParticipant.getLaneNo(),
                        existingParticipant.getCarColor(),
                        existingParticipant.getParticipantStatus()
                    ),
                    new JoinRaceResponse.RoomData(room.getRoomCode(), room.getStatus())
                );
            }
            String studentToken = jwtService.issueStudentToken(existingParticipant.getId(), room.getId());
            Student student = existingParticipant.getStudent();
            return new JoinRaceResponse(
                studentToken,
                new JoinRaceResponse.StudentData(student.getId(), student.getDisplayName()),
                new JoinRaceResponse.ParticipantData(
                    existingParticipant.getId(),
                    existingParticipant.getLaneNo(),
                    existingParticipant.getCarColor(),
                    existingParticipant.getParticipantStatus()
                ),
                new JoinRaceResponse.RoomData(room.getRoomCode(), room.getStatus())
            );
        }

        if (room.getStatus() != RaceRoomStatus.LOBBY && room.getStatus() != RaceRoomStatus.LOCKED) {
            throw new ApiException("ROOM_CLOSED", "החדר אינו זמין");
        }

        long count = countRegisteredParticipants(room);
        if (count >= room.getMaxParticipants()) {
            throw new ApiException("ROOM_FULL", "החדר מלא");
        }

        Student student = new Student();
        student.setDisplayName(request.displayName());
        student.setEmail(normalizedEmail);
        studentRepository.save(student);

        RaceParticipant participant = new RaceParticipant();
        participant.setRaceRoom(room);
        participant.setStudent(student);
        participant.setParticipantStatus(ParticipantStatus.PENDING);
        participant.setLaneNo(nextLane(room));
        participant.setCarColor(CAR_COLORS.get(Math.max(0, participant.getLaneNo() - 1)));
        raceParticipantRepository.save(participant);

        maybeLockRoom(room);

        String studentToken = jwtService.issueStudentToken(participant.getId(), room.getId());
        sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_requested", java.util.Map.of(
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

    @Transactional
    public RaceRoom updateRace(Long teacherId, String roomCode, CreateRaceRequest request) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        if (room.getStatus() != RaceRoomStatus.LOBBY && room.getStatus() != RaceRoomStatus.LOCKED) {
            throw new ApiException("ROOM_NOT_EDITABLE", "ניתן לערוך את המרוץ רק לפני שהוא מתחיל");
        }

        long registered = countRegisteredParticipants(room);
        if (request.maxParticipants() < registered) {
            throw new ApiException("MAX_PARTICIPANTS_TOO_LOW", "מספר המשתתפים המרבי לא יכול להיות נמוך ממספר הנרשמים");
        }

        room.setTitle(request.title());
        room.setClassName(request.className());
        room.setMaxParticipants(request.maxParticipants());
        room.setQuestionTimeMs(request.questionTimeMs());
        room.setInitialDifficulty(request.initialDifficulty());
        room.setEnableLuckEvents(request.enableLuckEvents());
        room.setEnablePathChoice(request.enablePathChoice());
        room.setRaceDurationMinutes(request.raceDurationMinutes());
        raceRoomRepository.save(room);

        if (room.getStatus() == RaceRoomStatus.LOCKED && registered < room.getMaxParticipants()) {
            room.setStatus(RaceRoomStatus.LOBBY);
            raceRoomRepository.save(room);
        } else if (room.getStatus() == RaceRoomStatus.LOBBY && registered >= room.getMaxParticipants()) {
            room.setStatus(RaceRoomStatus.LOCKED);
            raceRoomRepository.save(room);
        }

        return room;
    }

    @Transactional
    public RaceParticipant addStudentByTeacher(String roomCode, Long teacherId, AddStudentRequest request) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        if (room.getStatus() != RaceRoomStatus.LOBBY && room.getStatus() != RaceRoomStatus.LOCKED) {
            throw new ApiException("ROOM_CLOSED", "החדר אינו זמין");
        }
        String normalizedEmail = request.email().trim();
        if (raceParticipantRepository.findByRaceRoomAndStudent_EmailIgnoreCase(room, normalizedEmail).isPresent()) {
            throw new ApiException("STUDENT_ALREADY_REGISTERED", "התלמיד כבר רשום למרוץ זה");
        }
        if (countRegisteredParticipants(room) >= room.getMaxParticipants()) {
            throw new ApiException("ROOM_FULL", "החדר מלא");
        }

        Student student = new Student();
        student.setDisplayName(displayNameFromEmail(normalizedEmail));
        student.setEmail(normalizedEmail);
        studentRepository.save(student);

        RaceParticipant participant = new RaceParticipant();
        participant.setRaceRoom(room);
        participant.setStudent(student);
        participant.setParticipantStatus(ParticipantStatus.PENDING);
        participant.setLaneNo(nextLane(room));
        participant.setCarColor(CAR_COLORS.get(Math.max(0, participant.getLaneNo() - 1)));
        raceParticipantRepository.save(participant);
        maybeLockRoom(room);

        sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_requested", java.util.Map.of(
            "participantId", participant.getId(),
            "displayName", student.getDisplayName(),
            "laneNo", participant.getLaneNo()
        ));
        return participant;
    }

    @Transactional(readOnly = true)
    public List<OpenRaceRoomResponse> listOpenRaces() {
        return raceRoomRepository.findByStatusInAndArchivedAtIsNullOrderByCreatedAtDesc(List.of(RaceRoomStatus.LOBBY, RaceRoomStatus.LOCKED)).stream()
            .map(room -> {
                long registered = countRegisteredParticipants(room);
                return new OpenRaceRoomResponse(
                    room.getRoomCode(),
                    room.getTitle(),
                    room.getClassName(),
                    registered,
                    room.getMaxParticipants(),
                    room.getStatus()
                );
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentRaceSummaryResponse> listStudentRacesByEmail(String email) {
        String normalizedEmail = email == null ? "" : email.trim();
        if (normalizedEmail.isBlank()) {
            throw new ApiException("EMAIL_REQUIRED", "נדרש אימייל של תלמיד");
        }

        return raceParticipantRepository.findStudentRaceSummaries(normalizedEmail).stream()
            .map(participant -> {
                RaceRoom room = participant.getRaceRoom();
                return new StudentRaceSummaryResponse(
                    room.getRoomCode(),
                    room.getTitle(),
                    room.getClassName(),
                    room.getStatus(),
                    participant.getParticipantStatus(),
                    participant.getProgressPoints(),
                    participant.getScoreTotal(),
                    participant.getCorrectCount(),
                    participant.getWrongCount(),
                    participant.getAvgResponseMs(),
                    participant.getCreatedAt(),
                    room.getStartAt(),
                    room.getFinishAt()
                );
            })
            .toList();
    }

    @Transactional
    public RaceParticipant approveParticipant(String roomCode, Long teacherId, Long participantId) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        RaceParticipant participant = getParticipantInRoomOrThrow(room, participantId);
        if (participant.getParticipantStatus() != ParticipantStatus.PENDING) {
            throw new ApiException("PARTICIPANT_NOT_PENDING", "המשתתף אינו במצב המתנה");
        }
        long activeCount = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.ACTIVE);
        if (activeCount >= room.getMaxParticipants()) {
            throw new ApiException("ROOM_FULL", "החדר מלא");
        }
        String displayName = participant.getStudent() != null && participant.getStudent().getDisplayName() != null
            ? participant.getStudent().getDisplayName()
            : "Student";
        participant.setParticipantStatus(ParticipantStatus.ACTIVE);
        raceParticipantRepository.save(participant);
        maybeLockRoom(room);
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("participantId", participant.getId());
        payload.put("displayName", displayName);
        sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_approved", payload, participant.getId());
        return participant;
    }

    @Transactional
    public void leaveRaceAsStudent(String roomCode, Long participantId) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        RaceParticipant participant = getParticipantInRoomOrThrow(room, participantId);
        String displayName = participant.getStudent() != null && participant.getStudent().getDisplayName() != null
            ? participant.getStudent().getDisplayName()
            : "Student";

        if (room.getStatus() == RaceRoomStatus.LOBBY || room.getStatus() == RaceRoomStatus.LOCKED) {
            raceParticipantRepository.delete(participant);
            unlockRoomIfNeeded(room);
        } else if (room.getStatus() == RaceRoomStatus.RUNNING || room.getStatus() == RaceRoomStatus.PAUSED) {
            if (participant.getParticipantStatus() == ParticipantStatus.LEFT) {
                return;
            }
            participant.setParticipantStatus(ParticipantStatus.LEFT);
            raceParticipantRepository.save(participant);
        } else {
            throw new ApiException("RACE_ALREADY_FINISHED", "לא ניתן לעזוב מרוץ שכבר הסתיים");
        }

        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("participantId", participantId);
        payload.put("displayName", displayName);
        payload.put("reason", "STUDENT_LEFT");
        sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_cancelled", payload);
    }

    @Transactional
    public void rejectParticipant(String roomCode, Long teacherId, Long participantId) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        RaceParticipant participant = getParticipantInRoomOrThrow(room, participantId);
        if (participant.getParticipantStatus() != ParticipantStatus.PENDING) {
            throw new ApiException("PARTICIPANT_NOT_PENDING", "ניתן לדחות רק הרשמות ממתינות לאישור");
        }
        String displayName = participant.getStudent() != null && participant.getStudent().getDisplayName() != null
            ? participant.getStudent().getDisplayName()
            : "Student";
        raceParticipantRepository.delete(participant);
        unlockRoomIfNeeded(room);
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("participantId", participantId);
        payload.put("displayName", displayName);
        sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_rejected", payload, participantId);
    }

    @Transactional
    public void removeParticipant(String roomCode, Long teacherId, Long participantId) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        if (!isBeforeRaceStart(room)) {
            throw new ApiException("ROOM_NOT_EDITABLE", "ניתן להסיר תלמידים רק לפני תחילת המרוץ");
        }

        RaceParticipant participant = getParticipantInRoomOrThrow(room, participantId);
        String displayName = participant.getStudent() != null && participant.getStudent().getDisplayName() != null
            ? participant.getStudent().getDisplayName()
            : "Student";
        raceParticipantRepository.delete(participant);
        raceParticipantRepository.flush();
        unlockRoomIfNeeded(room);
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("participantId", participantId);
        payload.put("displayName", displayName);
        sseEventPublisher.publishAfterCommit(room.getRoomCode(), "registration_rejected", payload, participantId);
    }

    @Transactional
    public RaceRoom startRace(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        if (room.getStatus() != RaceRoomStatus.LOBBY && room.getStatus() != RaceRoomStatus.LOCKED) {
            throw new ApiException("ROOM_NOT_IN_LOBBY", "ניתן להתחיל את המרוץ רק מהלובי");
        }
        long activeCount = raceParticipantRepository.countByRaceRoomAndParticipantStatus(room, ParticipantStatus.ACTIVE);
        if (activeCount < 1) {
            throw new ApiException("NO_APPROVED_PARTICIPANTS", "אין משתתפים מאושרים");
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
    public RoomDetailsResponse getRoomDetails(Long teacherId, String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        ensureTeacherOwnsRoom(teacherId, room);
        List<RoomDetailsResponse.ParticipantRow> rows = raceParticipantRepository
            .findByRaceRoomOrderByProgressPointsDesc(room)
            .stream()
            .filter(p -> p.getParticipantStatus() == ParticipantStatus.PENDING
                || p.getParticipantStatus() == ParticipantStatus.ACTIVE)
            .map(p -> new RoomDetailsResponse.ParticipantRow(
                p.getId(),
                p.getStudent().getId(),
                p.getStudent().getDisplayName(),
                p.getStudent().getEmail() == null ? "" : p.getStudent().getEmail(),
                p.getLaneNo(),
                p.getCarColor(),
                p.getParticipantStatus(),
                p.getProgressPoints(),
                p.getScoreTotal()
            ))
            .toList();
        return new RoomDetailsResponse(
            room.getId(),
            room.getRoomCode(),
            room.getTitle(),
            room.getClassName(),
            room.getStatus(),
            room.getMaxParticipants(),
            room.getQuestionTimeMs(),
            room.getInitialDifficulty(),
            room.isEnableLuckEvents(),
            room.isEnablePathChoice(),
            room.getStartAt(),
            room.getRaceDurationMinutes(),
            rows
        );
    }

    @Transactional(readOnly = true)
    public List<RaceParticipant> getRoomParticipants(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        return raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room);
    }

    @Transactional(readOnly = true)
    public FinalResultsResponse getFinalResults(String roomCode) {
        RaceRoom room = getByRoomCodeOrThrow(roomCode);
        List<RaceResult> rows = raceResultRepository.findByRaceRoomOrderByFinalRankAsc(room).stream()
            .sorted((a, b) -> {
                int progressCompare = Integer.compare(b.getFinalProgress(), a.getFinalProgress());
                if (progressCompare != 0) {
                    return progressCompare;
                }
                return Integer.compare(b.getFinalScore(), a.getFinalScore());
            })
            .toList();
        List<FinalResultsResponse.ResultRow> leaderboard = IntStream.range(0, rows.size())
            .mapToObj(i -> {
                RaceResult r = rows.get(i);
                int rank = finalRankFor(rows, i);
                return new FinalResultsResponse.ResultRow(
                rank,
                r.getRaceParticipant().getStudent().getDisplayName(),
                r.getFinalProgress(),
                r.getFinalScore(),
                r.getAccuracyPct().doubleValue(),
                r.getAvgResponseMs(),
                r.getTotalCorrect(),
                r.getTotalWrong(),
                r.getTotalEvents()
                );
            })
            .toList();
        boolean firstPlaceTie = leaderboard.size() > 1 && leaderboard.get(0).rank() == leaderboard.get(1).rank();
        String winnerName = firstPlaceTie ? "שוויון" : rows.stream()
            .filter(r -> room.getWinnerParticipantId() != null && r.getRaceParticipant().getId().equals(room.getWinnerParticipantId()))
            .map(r -> r.getRaceParticipant().getStudent().getDisplayName())
            .findFirst()
            .orElse(leaderboard.isEmpty() ? "" : leaderboard.getFirst().displayName());
        return new FinalResultsResponse(room.getRoomCode(), room.getWinnerParticipantId(), winnerName, leaderboard);
    }

    private boolean isBeforeRaceStart(RaceRoom room) {
        if (room.getStartAt() != null) {
            return false;
        }
        return room.getStatus() == RaceRoomStatus.DRAFT
            || room.getStatus() == RaceRoomStatus.LOBBY
            || room.getStatus() == RaceRoomStatus.LOCKED;
    }

    private void maybeLockRoom(RaceRoom room) {
        if (countRegisteredParticipants(room) >= room.getMaxParticipants() && room.getStatus() == RaceRoomStatus.LOBBY) {
            room.setStatus(RaceRoomStatus.LOCKED);
            raceRoomRepository.save(room);
            sseEventPublisher.publishAfterCommit(room.getRoomCode(), "room_locked", java.util.Map.of(
                "status", "LOCKED",
                "message", "החדר ננעל - הגיע למכסת המשתתפים"
            ));
        }
    }

    private void unlockRoomIfNeeded(RaceRoom room) {
        if (room.getStatus() == RaceRoomStatus.LOCKED && countRegisteredParticipants(room) < room.getMaxParticipants()) {
            room.setStatus(RaceRoomStatus.LOBBY);
            raceRoomRepository.save(room);
            sseEventPublisher.publishAfterCommit(room.getRoomCode(), "room_unlocked", java.util.Map.of("status", "LOBBY"));
        }
    }

    private int nextLane(RaceRoom room) {
        List<Integer> used = raceParticipantRepository.findByRaceRoomOrderByProgressPointsDesc(room)
            .stream()
            .map(RaceParticipant::getLaneNo)
            .toList();
        return IntStream.rangeClosed(1, room.getMaxParticipants())
            .filter(i -> !used.contains(i))
            .findFirst()
            .orElseThrow(() -> new ApiException("NO_LANE_AVAILABLE", "אין מסלול פנוי"));
    }

    private String generateRoomCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private RaceParticipant getParticipantInRoomOrThrow(RaceRoom room, Long participantId) {
        RaceParticipant participant = raceParticipantRepository.findDetailedById(participantId)
            .orElseThrow(() -> new ApiException("PARTICIPANT_NOT_FOUND", "המשתתף לא נמצא"));
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "המשתתף אינו בחדר");
        }
        return participant;
    }

    private long countRegisteredParticipants(RaceRoom room) {
        return raceParticipantRepository.countByRaceRoomAndParticipantStatusIn(
            room,
            List.of(ParticipantStatus.PENDING, ParticipantStatus.ACTIVE)
        );
    }

    private int finalRankFor(List<RaceResult> rows, int index) {
        if (index == 0) {
            return 1;
        }
        RaceResult current = rows.get(index);
        RaceResult previous = rows.get(index - 1);
        if (current.getFinalProgress() == previous.getFinalProgress()
            && current.getFinalScore() == previous.getFinalScore()) {
            return finalRankFor(rows, index - 1);
        }
        return index + 1;
    }

    private String resolveStudentEmail(String email) {
        if (email != null && !email.isBlank()) {
            return email.trim().toLowerCase(Locale.ROOT);
        }
        return "guest." + UUID.randomUUID() + "@mathrace.local";
    }

    private String displayNameFromEmail(String email) {
        int atIndex = email.indexOf('@');
        String localPart = atIndex > 0 ? email.substring(0, atIndex) : email;
        String displayName = localPart.trim();
        if (displayName.isBlank()) {
            return "Student";
        }
        return displayName.length() > 80 ? displayName.substring(0, 80) : displayName;
    }
}
