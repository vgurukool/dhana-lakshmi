import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://platform.vgurukool.com/keycloak',
  realm: 'cnoe',
  clientId: 'vgurukool-apps'
});

export default keycloak;
