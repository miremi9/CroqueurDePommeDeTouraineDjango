from main.models import VisitorLog


class VisitorTrackingMiddleware:
    """Enregistre une visite unique par session pour compter les visiteurs du site."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.session.session_key:
            request.session.save()

        if not request.session.get("visit_logged"):
            VisitorLog.objects.get_or_create(session_key=request.session.session_key)
            request.session["visit_logged"] = True

        return self.get_response(request)
