import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../lib/Button';
import { inIframe } from '../../utils';
import AuthIndicator from '../AuthIndicator/AuthIndicator';

function Login({ controller }) {
  const [currentSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSignedIn, setIsSignedIn] = useState<boolean>();

  useEffect(() => {
    async function fetchSignedInStatus() {
      const currentlySignedIn = await controller.isSignedIn();
      setTimeout(() => setIsSignedIn(currentlySignedIn), 2000);
    }

    fetchSignedInStatus();
  }, [controller]);

  useEffect(() => {
    const isRecovery = currentSearchParams.get('isRecovery');
    if (isRecovery) {
      if (isRecovery === 'true') {
        navigate({
          pathname: '/add-device',
          search:   currentSearchParams.toString()
        });
      } else {
        navigate({
          pathname: '/create-account',
          search:   currentSearchParams.toString()
        });
      }
    }
  }, [currentSearchParams]);

  return (
    <div>
      Login route
      <AuthIndicator controller={window.fastAuthController} />
      <Button
        label="New account"
        variant="affirmative"
        onClick={() => {
          navigate({
            pathname: '/create-account',
            search:   currentSearchParams.toString()
          });
          if (!isSignedIn && inIframe()) {
            window.open(`${window.location.origin}${location.pathname}${location.search}`, '_parent');
          }
        }}
      />
      <Button
        label="Existing account"
        variant="affirmative"
        onClick={() => {
          navigate({
            pathname: '/add-device',
            search:   currentSearchParams.toString()
          });
          if (!isSignedIn && inIframe()) {
            window.open(`${window.location.origin}${location.pathname}${location.search}`, '_parent');
          }
        }}
      />
    </div>
  );
}

export default Login;
