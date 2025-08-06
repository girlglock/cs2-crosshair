# cs2-crosshair-viewer
this silly app allows you to preview CS2 crosshairs of players by their steamid64, vanity url or crosshair code and make edits to them.

> [!NOTE]  
> this is my first ever web app, i did my best to make it secure and easy to use, but i'm not a full stack developer so if you find anything critical to improve, please let me know or feel free to contribute :3

## requirements

- nodejs ^14
- PM2
- nginx
- git

---
> [!NOTE]  
> some assets like the staticCrosshairRenderer.js, backdround images and the pro-players.json file are being fetched from this repo to cut down the payload sent to the user. if you want to change them you need to edit the crosshair-preview.html template

## deploying
### 1. clone and install dependencies

```bash
git clone https://github.com/girlglock/cs2-crosshair.git
cd cs2-crosshair
npm install
```

### 2. edit the `config.js` file to include your domain

```js
const config = {
    port: 3001,
    host: 'c.girlglock.com', // replace with your domain that you pointed to your server
    domain: 'c.girlglock.com', // replace with your domain that you pointed to your server
    ...
};
```

### 3. start the app with PM2

```bash
pm2 start crosshair-ecosystem.config.js --env production
pm2 save
pm2 startup
```

> this will start the app on `http://127.0.0.1:3001`.

---

### 4. set up nginx

1. edit the `crosshair.conf` file with the domain you want to host the app on:

```conf
server {
    listen 80;
    server_name c.girlglock.com; // replace with your domain that you pointed to your server
    ...
}
```

2. copy the `crosshair.conf` file to nginx:

```bash
sudo cp crosshair.conf /etc/nginx/sites-available/crosshair
sudo ln -s /etc/nginx/sites-available/crosshair /etc/nginx/sites-enabled/
```

3. test nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

now your server will be live on the domain specified in the `crosshair.conf` file


## for viewing logs

- app logs:
  ```bash
  pm2 logs cs2-crosshair
  ```

- nginx logs:
  ```bash
  tail -f /var/log/nginx/crosshair.error.log
  ```


## ssl

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d c.girlglock.com # replace with your domain that you pointed to your server
```


## restarting, stopping and starting

- to restart the server:
  ```bash
  pm2 restart cs2-crosshair
  ```

- to stop the server:
  ```bash
  pm2 stop cs2-crosshair
  ```

- to start the server:
  ```bash
  pm2 start cs2-crosshair
  ```

## credits

- app by [girlglock](https://github.com/girlglock/)
- crosshair code decoding by [SyberiaK](https://github.com/SyberiaK/csxhair) ported to js
- crosshair rendering inspired by [csgocfgr_client](https://github.com/tjrawrin/csgocfgr-client)
