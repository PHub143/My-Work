import React, { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ToeicHub from '../components/ToeicHub';
import { useAuth } from '../AuthContext';
import { YBM_VOLUMES, getVolume } from '../data/ybm/manifest.js';
import { getTestReadiness, loadAttempt } from '../utils/ybm.js';

const DEFAULT_VOLUME = 'vol-2';
const DISABLED_VOLUME_IDS = new Set([]);

function getTestStatus(userId, test) {
  const readiness = getTestReadiness(test);
  if (!readiness.isPlayable) {
    return { kind: 'unavailable', readiness };
  }

  const attempt = loadAttempt(userId, test.id);
  if (attempt?.submittedAt) {
    return { kind: 'done', readiness, score: attempt.score || null };
  }
  if (attempt) {
    return { kind: 'in-progress', readiness };
  }
  return { kind: 'new', readiness };
}

const English = () => {
  const { volumeId } = useParams();
  const { user } = useAuth();

  const volume = getVolume(volumeId);
  const tests = useMemo(
    () => (volume ? volume.tests.map((test) => ({ test, status: getTestStatus(user?.id, test) })) : []),
    [user?.id, volume],
  );

  if (!volumeId) {
    return <Navigate to={`/learning/english/toeic/ybm/${DEFAULT_VOLUME}`} replace />;
  }
  if (!volume || DISABLED_VOLUME_IDS.has(volume.id)) {
    return <Navigate to={`/learning/english/toeic/ybm/${DEFAULT_VOLUME}`} replace />;
  }

  return (
    <ToeicHub
      collection="ybm"
      basePath="/learning/english/toeic/ybm"
      volumesLabel="YBM volumes"
      volumes={YBM_VOLUMES}
      volume={volume}
      tests={tests}
      disabledVolumeIds={DISABLED_VOLUME_IDS}
    />
  );
};

export default English;
