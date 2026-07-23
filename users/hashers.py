import bcrypt
from django.contrib.auth.hashers import BasePasswordHasher


class SpringBCryptPasswordHasher(BasePasswordHasher):
    algorithm = "bcrypt"

    def encode(self, password, salt):
        hashed = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        )
        return hashed.decode("utf-8")

    def verify(self, password, encoded):
        return bcrypt.checkpw(
            password.encode("utf-8"),
            encoded.encode("utf-8")
        )

    def decode(self, encoded):
        return {
            "algorithm": self.algorithm,
            "hash": encoded,
        }

    def safe_summary(self, encoded):
        return {
            "algorithm": self.algorithm,
            "hash": encoded,
        }

    def must_update(self, encoded):
        return False

    def harden_runtime(self, password, encoded):
        pass
