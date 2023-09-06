import { set } from 'lodash';

export default (buildStatusPath) =>
    (state, action) =>
        set(state, [...buildStatusPath(action), 'status', 'isInitialized'], true);
