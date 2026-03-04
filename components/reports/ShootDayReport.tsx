"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Project, ShootDay, Scene } from "@/types";

const LTR: React.FC<{ children: string }> = ({ children }) => (
  <Text style={{ direction: "ltr", textAlign: "left", fontFamily: "Heebo" }}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Heebo",
    direction: "rtl",
  },
  text: {
    textAlign: "right",
    fontFamily: "Heebo",
  },
  h1: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "Heebo",
    marginBottom: 4,
    textAlign: "right",
  },
  h2: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "Heebo",
    marginBottom: 6,
    textAlign: "right",
  },
  label: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Heebo",
    marginBottom: 2,
    textAlign: "right",
  },
  body: {
    fontSize: 11,
    fontFamily: "Heebo",
    textAlign: "right",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginVertical: 10,
  },
  block: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  mutedBlock: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
  },
  header: {
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "Heebo",
    marginTop: 2,
    textAlign: "right",
  },
  generatedAt: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Heebo",
    marginTop: 12,
    textAlign: "right",
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 4,
    textAlign: "right",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Heebo",
    width: 100,
    textAlign: "right",
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: "Heebo",
    flex: 1,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "Heebo",
    marginTop: 14,
    marginBottom: 8,
    textAlign: "right",
  },
  sceneCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    minHeight: 44,
  },
  sceneCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  sceneNumber: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "Heebo",
    textAlign: "right",
  },
  sceneTime: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Heebo",
    textAlign: "left",
  },
  sceneName: {
    fontSize: 11,
    fontFamily: "Heebo",
    marginBottom: 2,
    textAlign: "right",
  },
  sceneMeta: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Heebo",
    marginTop: 2,
    textAlign: "right",
  },
  sceneDescription: {
    fontSize: 10,
    color: "#334155",
    fontFamily: "Heebo",
    marginTop: 4,
    textAlign: "right",
  },
});

export interface ShootDayReportProps {
  project: Project;
  shootDay: ShootDay;
  scenes: Scene[];
  generatedAt: string;
}

export function ShootDayReport({
  project,
  shootDay,
  scenes,
  generatedAt,
}: ShootDayReportProps) {
  const sortedScenes = [...scenes].sort(
    (a, b) => a.shootOrderNumber - b.shootOrderNumber
  );
  const generatedLabel = new Date(generatedAt).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={[styles.h1, styles.text]}>{project.name}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
            <Text style={[styles.subtitle, styles.text]}>
              {shootDay.title || "יום צילום"}
              {shootDay.date ? " · " : ""}
            </Text>
            {shootDay.date ? <LTR>{shootDay.date}</LTR> : null}
          </View>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", marginTop: 4 }}>
            <Text style={[styles.generatedAt, styles.text]}>נוצר: </Text>
            <LTR>{generatedLabel}</LTR>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.mutedBlock}>
          <Text style={[styles.label, styles.text]}>סה״כ סצנות</Text>
          <LTR>{String(sortedScenes.length)}</LTR>
          {shootDay.generalNotes?.trim() ? (
            <>
              <Text style={[styles.label, styles.text, { marginTop: 8 }]}>הערות כלליות</Text>
              <Text style={[styles.body, styles.text]}>{shootDay.generalNotes.trim()}</Text>
            </>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, styles.text]}>סצנות</Text>

        {sortedScenes.map((scene) => {
          const timeStr = `${scene.startTime ?? ""}${scene.startTime && scene.endTime ? "–" : ""}${scene.endTime ?? ""}`;
          return (
          <View key={scene.id} style={styles.sceneCard} wrap={false}>
            <View style={[styles.sceneCardHeader, { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }]}>
              <Text style={[styles.sceneNumber, styles.text]}>סצנה</Text>
              <LTR>{String(scene.shootOrderNumber)}</LTR>
              <View style={{ flex: 1 }} />
              {(scene.startTime || scene.endTime) ? <LTR>{timeStr}</LTR> : null}
            </View>
            {scene.name ? (
              <Text style={[styles.sceneName, styles.text]}>{scene.name}</Text>
            ) : null}
            {scene.scriptSceneNumber ? (
              <Text style={[styles.sceneMeta, styles.text]}>
                סצינת תסריט: {scene.scriptSceneNumber}
              </Text>
            ) : null}
            {scene.description?.trim() ? (
              <Text style={[styles.sceneDescription, styles.text]}>
                {scene.description.trim()}
              </Text>
            ) : null}
          </View>
          );
        })}
      </Page>
    </Document>
  );
}
