import { useEffect, useRef } from "react";
import { createRoomStream } from "../services/sse";

export function useRaceStream(roomCode, onEvent) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!roomCode) return;
    const es = createRoomStream(roomCode, (event) => handlerRef.current(event));
    return () => es.close();
  }, [roomCode]);
}
