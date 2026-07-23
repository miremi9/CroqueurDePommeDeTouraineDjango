sudo docker compose build --no-cache backend

sudo docker compose logs -f backend

sudo docker compose down
sudo docker compose build --no-cache backend
sudo docker compose up -d