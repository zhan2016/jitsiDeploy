#!/bin/bash

#Configure

DOMAIN_NAME=165.227.63.216
YOURSECRET1=yoursecret1
YOURSECRET2=yoursecret2
YOURSECRET3=yoursecret3
KEYPATH=/etc/ssl/private/nginx-selfsigned.key
CERTPATH=/etc/ssl/certs/nginx-selfsigned.crt
KEYPRAMETER="/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=$DOMAIN_NAME"
LOCALIP=127.0.0.1
PUBLICKIP=165.227.63.216

# Prosody

apt-get install prosody
cat > $DOMAIN_NAME.cfg.lua <<EndOfText
VirtualHost "$DOMAIN_NAME"
    authentication = "anonymous"
    ssl = {
        key = "/var/lib/prosody/$DOMAIN_NAME.key";
        certificate = "/var/lib/prosody/$DOMAIN_NAME.crt";
    }
    modules_enabled = {
        "bosh";
        "pubsub";
    }
    c2s_require_encryption = false
VirtualHost "auth.$DOMAIN_NAME"
    ssl = {
        key = "/var/lib/prosody/auth.$DOMAIN_NAME.key";
        certificate = "/var/lib/prosody/auth.$DOMAIN_NAME.crt";
    }
    authentication = "internal_plain"
admins = { "focus@auth.$DOMAIN_NAME" }
Component "conference.$DOMAIN_NAME" "muc"
Component "jitsi-videobridge.$DOMAIN_NAME"
    component_secret = "$YOURSECRET1"
Component "focus.$DOMAIN_NAME"
    component_secret = "$YOURSECRET2"
EndOfText

mkdir -p /etc/prosody/conf.avail && cp $DOMAIN_NAME.cfg.lua /etc/prosody/conf.avail/
ln -s /etc/prosody/conf.avail/$DOMAIN_NAME.cfg.lua /etc/prosody/conf.d/$DOMAIN_NAME.cfg.lua
#prosodyctl cert generate  $DOMAIN_NAME
#prosodyctl cert generate auth.$DOMAIN_NAME
openssl req -new -x509 -days 365 -nodes -out  "/var/lib/prosody/$DOMAIN_NAME.crt" -newkey rsa:2048 -keyout  "/var/lib/prosody/$DOMAIN_NAME.key" -subj "/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=$DOMAIN_NAME"
openssl req -new -x509 -days 365 -nodes -out "/var/lib/prosody/auth.$DOMAIN_NAME.crt" -newkey rsa:2048 -keyout "/var/lib/prosody/auth.$DOMAIN_NAME.key" -subj "/C=GB/ST=London/L=London/O=Global Security/OU=IT Department/CN=auth.$DOMAIN_NAME"


ln -sf /var/lib/prosody/auth.$DOMAIN_NAME.crt /usr/local/share/ca-certificates/auth.$DOMAIN_NAME.crt
update-ca-certificates -f
prosodyctl register focus auth.$DOMAIN_NAME $YOURSECRET3
prosodyctl restart

err=$?
if [ "${err}" -ne 0 ]; then exit "${err}"; fi

#openSSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout $KEYPATH -out $CERTPATH -subj $KEYPRAMETER 


#  NGINX

apt-get install nginx
cat > $DOMAIN_NAME <<EndOfText
server {
listen 443;
ssl on;
# tls configuration that is not covered in this guide
# we recommend the use of https://certbot.eff.org/
server_name $DOMAIN_NAME;
ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
ssl_ciphers HIGH:!aNULL:!MD5;
# set the root
root /srv/$DOMAIN_NAME;
index index.html;
location ~ ^/([a-zA-Z0-9=?]+)$ {
rewrite ^/(.*)$ / break;
}
location / {
ssi on;
}
# BOSH
location /http-bind {
		proxy_pass http://localhost:5280/http-bind;
		proxy_set_header X-Forwarded-For \$remote_addr;
		proxy_set_header Host \$http_host;
	}
}
EndOfText
mkdir -p /etc/nginx/sites-available && cp $DOMAIN_NAME /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME
mkdir -p /srv && cp -r jitsi-meet /srv/$DOMAIN_NAME
invoke-rc.d nginx restart
err=$?
if [ "${err}" -ne 0 ]; then exit "${err}"; fi

# Videobridge & jicofo

#apt-get install default-jre

mkdir -p /opt && cp -r jitsi-videobridge /opt/ && cp -r jicofo /opt/

echo org.jitsi.impl.neomedia.transform.srtp.SRTPCryptoContext.checkReplay=false > sip-communicator.properties
echo org.jitsi.videobridge.NAT_HARVESTER_LOCAL_ADDRESS=$LOCALIP >>sip-communicator.properties
echo org.jitsi.videobridge.NAT_HARVESTER_PUBLIC_ADDRESS=$PUBLICKIP >>sip-communicator.properties

mkdir -p ~/.sip-communicator && cp sip-communicator.properties ~/.sip-communicator/

# Clean up

rm $DOMAIN_NAME.cfg.lua $DOMAIN_NAME sip-communicator.properties

# Run

/opt/jitsi-videobridge/jvb.sh --host=localhost --domain=$DOMAIN_NAME  --port=5347 --secret=$YOURSECRET1 &
/opt/jicofo/jicofo.sh --host=localhost --domain=$DOMAIN_NAME --secret=$YOURSECRET2 --user_domain=auth.$DOMAIN_NAME --user_name=focus --user_password=$YOURSECRET3 &

