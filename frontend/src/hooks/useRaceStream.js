import { useEffect, useRef } from "react";
import { createRoomStream } from "../services/sse";

const MAX_RETRIES = 8;

export function useRaceStream(roomCode, onEvent, options = {}) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const retryRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!roomCode) return undefined;

    let es;
    let closedByUser = false;

    const connect = () => {
      es = createRoomStream(roomCode, (event) => handlerRef.current(event), options);
      es.onerror = () => {
        if (closedByUser) return;
        es.close();
        if (retryRef.current >= MAX_RETRIES) return;
        const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        timerRef.current = window.setTimeout(connect, delay);
      };
      es.addEventListener("heartbeat", () => {
        retryRef.current = 0;
      });
    };

    connect();

    return () => {
      closedByUser = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (es) es.close();
    };
  }, [roomCode, options.role, options.participantId]);
}
