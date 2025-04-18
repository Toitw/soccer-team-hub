#!/bin/bash
curl -s -X GET "http://localhost:5000/api/admin/users" -H "Cookie: connect.sid=s%3ADQ5ISH7mAiGVmb-8Iwy7bA9zf-Jh4Frv.pE%2BY7NnUhVoZyLDtaA1rmbY6RGuS3n6EBtr3%2FX08QCs" | grep -o '{"id":[0-9]*,"username":"testusuario"[^}]*}'
