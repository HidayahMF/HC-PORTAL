import { useEffect, useState } from 'react';
import api, { errMsg } from '../api/client.js';

/** Fetch sederhana dengan state loading/error/refresh. */
export function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api
      .get(path)
      .then((res) => alive && setData(res.data))
      .catch((e) => alive && setError(errMsg(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
