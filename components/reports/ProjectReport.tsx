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
  generatedAt: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Heebo",
    marginTop: 8,
    textAlign: "right",
  },
  tocItem: {
    flexDirection: "row",
    marginBottom: 4,
    textAlign: "right",
  },
  tocNum: {
    fontSize: 11,
    fontFamily: "Heebo",
    width: 24,
    textAlign: "right",
  },
  tocText: {
    fontSize: 11,
    fontFamily: "Heebo",
    flex: 1,
    textAlign: "right",
  },
  daySection: {
    marginTop: 0,
  },
  dayHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "Heebo",
    textAlign: "right",
  },
  dayDate: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "Heebo",
    marginTop: 2,
    textAlign: "right",
  },
  dayNotes: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Heebo",
    marginTop: 6,
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

export interface ProjectReportProps {
  project: Project;
  shootDays: ShootDay[];
  scenesByDay: Record<string, Scene[]>;
  generatedAt: string;
}

export function ProjectReport({
  project,
  shootDays,
  scenesByDay,
  generatedAt,
}: ProjectReportProps) {
  const sortedDays = [...shootDays].sort(
    (a, b) => (a.shootOrderIndex ?? 999) - (b.shootOrderIndex ?? 999)
  );
  const generatedLabel = new Date(generatedAt).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const totalScenes = sortedDays.reduce(
    (sum, d) => sum + (scenesByDay[d.id]?.length ?? 0),
    0
  );

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.h1, styles.text]}>דוח הפקה – פרויקט</Text>
        <Text style={[styles.h1, styles.text, { marginTop: 12 }]}>{project.name}</Text>
        {project.clientName ? (
          <Text style={[styles.body, styles.text]}>{project.clientName}</Text>
        ) : null}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", marginTop: 8 }}>
          <Text style={[styles.generatedAt, styles.text]}>נוצר: </Text>
          <LTR>{generatedLabel}</LTR>
        </View>

        <View style={styles.divider} />

        <View style={styles.mutedBlock}>
          <Text style={[styles.label, styles.text]}>מספר ימי צילום</Text>
          <LTR>{String(sortedDays.length)}</LTR>
          <Text style={[styles.label, styles.text, { marginTop: 8 }]}>סה״כ סצינות</Text>
          <LTR>{String(totalScenes)}</LTR>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.h2, styles.text]}>תוכן עניינים</Text>
        {sortedDays.map((day, i) => (
          <View key={day.id} style={styles.tocItem}>
            <LTR>{String(i + 1) + "."}</LTR>
            <Text style={[styles.tocText, styles.text]}>
              {day.title || "יום צילום"}
              {day.date ? " — " : ""}
            </Text>
            {day.date ? <LTR>{day.date}</LTR> : null}
          </View>
        ))}
      </Page>

      {/* One page per shoot day */}
      {sortedDays.map((day, dayIndex) => {
        const scenes = (scenesByDay[day.id] ?? [])
          .slice()
          .sort((a, b) => a.shootOrderNumber - b.shootOrderNumber);
        return (
          <Page key={day.id} size="A4" style={styles.page}>
            <View style={styles.daySection}>
              <View style={styles.dayHeader}>
                <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center" }}>
                  <Text style={[styles.dayTitle, styles.text]}>
                    יום צילום — {day.title || "יום צילום"}
                  </Text>
                  <LTR>{String(dayIndex + 1)}</LTR>
                </View>
                {day.date ? (
                  <LTR>{day.date}</LTR>
                ) : null}
                {day.generalNotes?.trim() ? (
                  <Text style={[styles.dayNotes, styles.text]}>
                    {day.generalNotes.trim()}
                  </Text>
                ) : null}
              </View>

              {scenes.map((scene) => {
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
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
