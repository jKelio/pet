{{/*
Expand the name of the chart.
*/}}
{{- define "pet.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "pet.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" (include "pet.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "pet.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Server selector labels
*/}}
{{- define "pet.server.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pet.fullname" . }}-server
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Web selector labels
*/}}
{{- define "pet.web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pet.fullname" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
