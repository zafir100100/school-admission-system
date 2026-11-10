#!/usr/bin/env python3
"""End-to-end API and concurrency smoke tests. Requires only Python stdlib."""

import concurrent.futures, json, os, time, urllib.request, urllib.error, uuid

BASE = os.environ.get("API_URL", "http://localhost:8080")
STUDENT = "20152691234567890"


def call(method, path, body=None, student=None):
    headers = {"Content-Type": "application/json"}
    if student:
        headers["X-Student-Id"] = student
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read()) if r.status != 204 else None
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def new_class(seats):
    code, body = call(
        "POST",
        "/classes",
        {"name": "Integration " + uuid.uuid4().hex, "totalSeats": seats},
    )
    assert code == 201, (code, body)
    return body["id"]


def run():
    c = new_class(2)
    assert call("POST", f"/classes/{c}/holds", student="bad")[0] == 400
    code, a = call("POST", f"/classes/{c}/holds", student=STUDENT)
    assert code == 201, (code, a)
    assert a["status"] == "HELD"
    assert call("POST", f"/classes/{c}/holds", student=STUDENT)[0] == 409
    assert (
        call("POST", f'/holds/{a["holdId"]}/confirm', student="20152691234567891")[0]
        == 403
    )
    assert call("POST", f'/holds/{a["holdId"]}/confirm', student=STUDENT)[0] == 200
    assert call("POST", f'/holds/{a["holdId"]}/confirm', student=STUDENT)[0] == 200
    assert call("DELETE", f'/holds/{a["holdId"]}', student=STUDENT)[0] == 409
    assert call("GET", f"/classes/{c}")[1]["confirmedSeats"] == 1
    code, b = call("POST", f"/classes/{c}/holds", student="20152691234567892")
    assert code == 201, (code, b)
    assert call("GET", f"/classes/{c}")[1]["availableSeats"] == 0
    assert (
        call("DELETE", f'/holds/{b["holdId"]}', student="20152691234567892")[0] == 204
    )
    assert call("GET", f"/classes/{c}")[1]["availableSeats"] == 1
    assert any(
        h["holdId"] == a["holdId"] for h in call("GET", "/me/holds", student=STUDENT)[1]
    )
    c2 = new_class(3)

    def race(i):
        return call("POST", f"/classes/{c2}/holds", student=str(20000000000000000 + i))[
            0
        ]

    with concurrent.futures.ThreadPoolExecutor(max_workers=40) as pool:
        results = list(pool.map(race, range(40)))
    assert results.count(201) == 3, results
    assert results.count(409) == 37, results
    summary = call("GET", f"/classes/{c2}")[1]
    assert summary["heldSeats"] == 3 and summary["availableSeats"] == 0, summary
    print(
        "PASS: validation, duplicate prevention, student isolation, idempotency, cancellation, capacity, 40-request concurrency"
    )
    print(
        "Expiry: configure HOLD_DURATION_SECONDS=2, restart backend, reserve a new seat, wait 3 seconds and verify EXPIRED/availability."
    )


if __name__ == "__main__":
    run()
