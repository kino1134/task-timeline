import React, { Component, Fragment } from 'react'

import Timeline, { TimelineMarkers, TodayMarker } from 'react-calendar-timeline'
import { defaultHeaderLabelFormats, defaultSubHeaderLabelFormats } from 'react-calendar-timeline/lib/lib/default-config'
import 'react-calendar-timeline/lib/Timeline.css'

import NotificationSystem from 'react-notification-system'

import bulmaCalendar from 'bulma-extensions/bulma-calendar/dist/js/bulma-calendar.min.js'
import 'bulma-extensions/bulma-calendar/dist/css/bulma-calendar.min.css'

import moment from 'moment'
import 'moment/locale/ja'
import Papa from 'papaparse'
import download from 'downloadjs'

import './TimelineApp.css'

class TimelineApp extends Component {
  constructor (props) {
    super(props)

    // 日付の表示書式を一部上書き
    defaultHeaderLabelFormats.dayLong = 'M/D(dd)'
    defaultSubHeaderLabelFormats.hourShort = 'H'
    defaultSubHeaderLabelFormats.hourLong = 'H'

    // スケジュールの開始日を初期設定
    const minDate = moment().startOf('day')
    // スケジュールの終了日を初期設定
    const maxDate = moment(minDate).add(1, 'day')

    this._scrollRef = null
    this._notificationSystem = null
    this._fileInput = React.createRef()

    this._minTime = React.createRef()

    this.state = {
      showEditArea: true,
      minTime: minDate.valueOf(),
      maxTime: maxDate.valueOf(),
      groups: [],
      items: [],
      selectedItem: { title: '' }
    }
  }

  componentDidMount () {
    this._notificationSystem = this.refs.notificationSystem

    const calendars = bulmaCalendar.attach('[data-bulma-calendar]', { showHeader: false, showFooter: false })
    calendars.forEach(c => c.on('date:selected', date => console.log(date)))
  }

  setDuration () {
    const minDate = moment(document.getElementById('minTime').value, 'YYYY/MM/DD', true)
    const maxDate = moment(document.getElementById('maxTime').value, 'YYYY/MM/DD', true)

    if (document.getElementById('shiftTask').checked) {
      const diff = minDate.diff(moment(this.state.minTime), 'days')
      const items = this.state.items.map(item => {
        return {...item,
          start_time: moment(item.start_time).add(diff, 'day'),
          end_time: moment(item.end_time).add(diff, 'day')
        }
      })
      this.setState({ items })
    }

    if (minDate.isValid() && maxDate.isValid()) {
      this.setState({
        minTime: minDate.valueOf(),
        maxTime: maxDate.add(1, 'day').valueOf()
      })
    } else {
      this.showError('日付の書式が間違っています。')
    }
  }

  showError (message) {
    this._notificationSystem.addNotification({
      message, level: 'error'
    })
  }

  addLane () {
    const title = document.getElementById('lane').value
    if (!title) {
      this.showError('タイトルが未入力です。')
      return
    }
    if (this.state.groups.some(g => g.title === title)) {
      this.showError('タイトルが重複しています。')
      return
    }

    const nextId = Math.max(...this.state.groups.map(g => g.id), 0) + 1
    this.setState({ groups: [...this.state.groups, {
      id: nextId, title
    }] })
  }

  addTask () {
    const group = parseInt(document.getElementById('addGroup').value)
    if (!(group > 0)) {
      this.showError('レーンが未選択です。')
      return
    }
    const title = document.getElementById('addTitle').value
    if (!title) {
      this.showError('タスク名が未入力です。')
      return
    }
    const id = Math.max(...this.state.items.map(g => g.id), 0) + 1
    const startDay = document.getElementById('startDay').value
    const startHour = document.getElementById('startHour').value
    const startMinute = document.getElementById('startMinute').value
    const endDay = document.getElementById('endDay').value
    const endHour = document.getElementById('endHour').value
    const endMinute = document.getElementById('endMinute').value
    this.setState({ items: [
      ...this.state.items,
      {
        id, group, title,
        start_time: moment(this.state.minTime).add(startDay, 'days').add(startHour, 'hours').add(startMinute, 'minutes'),
        end_time: moment(this.state.minTime).add(endDay, 'days').add(endHour, 'hours').add(endMinute, 'minutes'),
      }
    ]})
  }

  editSelectedItem () {
    const title = document.getElementById('editTitle').value
    const startDay = document.getElementById('startDayEdit').value
    const startHour = document.getElementById('startHourEdit').value
    const startMinute = document.getElementById('startMinuteEdit').value
    const endDay = document.getElementById('endDayEdit').value
    const endHour = document.getElementById('endHourEdit').value
    const endMinute = document.getElementById('endMinuteEdit').value
    this.setState({ selectedItem:{
      ...this.state.selectedItem,
      title,
      start_time: moment(this.state.minTime).add(startDay, 'days').add(startHour, 'hours').add(startMinute, 'minutes'),
      end_time: moment(this.state.minTime).add(endDay, 'days').add(endHour, 'hours').add(endMinute, 'minutes'),
    }})
  }

  editTask () {
    const index = this.state.items.findIndex(i => i.id === this.state.selectedItem.id)
    if (index < 0) return
    const title = document.getElementById('editTitle').value
    if (!title) {
      this.showError('タスク名が未入力です。')
      return
    }
    this.setState({ items: [
      ...this.state.items.slice(0, index),
      {...this.state.selectedItem},
      ...this.state.items.slice(index + 1)
    ]})
  }

  deleteTask () {
    const index = this.state.items.findIndex(i => i.id === this.state.selectedItem.id)
    if (index < 0) return
    this.setState({ items: [
      ...this.state.items.slice(0, index),
      ...this.state.items.slice(index + 1)
    ], selectedItem: { title: '' } })
  }

  toggleCompleteTask () {
    const index = this.state.items.findIndex(i => i.id === this.state.selectedItem.id)
    if (index < 0) return
    this.setState({ items: [
      ...this.state.items.slice(0, index),
      {...this.state.items[index], complete: !this.state.items[index]['complete'] },
      ...this.state.items.slice(index + 1)
    ] })
  }

  export () {
    const groups = this.state.groups.map(group => [ 'g', group.title ])
    const items = this.state.items.map(item => {
      const group = this.state.groups.find(g => g.id === item.group)
      return [ 'i', group.title, item.title, item.start_time.format('YYYY/MM/DD HH:mm'), item.end_time.format('YYYY/MM/DD HH:mm') ]
    })
    const csv = Papa.unparse([...groups, ...items])
    download(csv, 'export.csv', 'text/csv')
  }

  import () {
    this._fileInput.current.click()
  }
  importing () {
    Papa.parse(this._fileInput.current.files[0], { complete: ({ data, errors, meta }) => {
      const groups = data.filter(d => d[0] === 'g').map((d, i) => {
        return { id: i+1, title: d[1] }
      })
      const items = data.filter(d => d[0] === 'i').map((d, i) => {
        return {
          id: i+1,
          group: groups.find(g => g.title === d[1]).id,
          title: d[2],
          start_time: moment(d[3], 'YYYY/MM/DD HH:mm', true),
          end_time: moment(d[4], 'YYYY/MM/DD HH:mm', true)
        }
      })
      const minTime = moment(moment.min(items.map(i => i.start_time))).startOf('day').valueOf()
      const maxTime = moment(moment.max(items.map(i => i.end_time))).add(1, 'days').startOf('day').valueOf()
      this.setState({ groups, items, minTime, maxTime })
      this._scrollRef.scrollLeft = 0
      document.getElementById('minTime').value = moment(this.state.minTime).format('YYYY/MM/DD')
      document.getElementById('maxTime').value = moment(this.state.maxTime).subtract(1, 'day').format('YYYY/MM/DD')
      this._fileInput.current.value = null
    }})
  }

  renderEditArea () {
    return (
      <Fragment>
        <div className="container is-fluid">
          <div className="field is-horizontal">
            <div className="field-label is-normal">期間：</div>
            <div className="field-body">
              <div className="field has-addons is-narrow">
                <div className="control">
                  <input id="minTime" className="input" name="minTime"
                    data-bulma-calendar="true" type="text" data-date-format="YYYY/MM/DD"
                    defaultValue={moment(this.state.minTime).format('YYYY/MM/DD')}
                  />
                </div>
                <p className="control">
                  <span className="button is-static">〜</span>
                </p>
                <p className="control">
                  <input id="maxTime" className="input" name="maxTime"
                    defaultValue={moment(this.state.maxTime).subtract(1, 'day').format('YYYY/MM/DD')}
                  />
                </p>
              </div>
            </div>
          </div>
          <div className="field is-horizontal">
            <div className="field-label is-normal"></div>
            <div className="field-body">
              <div className="field is-narrow">
                <input type="checkbox" className="is-checkradio is-info" id="shiftTask" name="shiftTask" />
                <label htmlFor="shiftTask">タスクの期間もずらす</label>
              </div>
              <div className="field">
                <p className="control">
                  <button className="button is-info" onClick={e => this.setDuration(e) }>反映</button>
                </p>
              </div>
            </div>
          </div>
          <div className="field is-horizontal">
            <div className="field-label is-normal">レーン追加：</div>
            <div className="field-body">
              <div className="field is-expanded">
                <p className="control">
                  <input id="lane" className="input" name="lane" />
                </p>
              </div>
              <div className="field">
                <p className="control">
                  <button className="button is-info" onClick={e => this.addLane(e) }>追加</button>
                </p>
              </div>
            </div>
          </div>
          <div className="field is-horizontal">
            <div className="field-label is-normal">タスク追加：</div>
            <div className="field-body">
              <div className="field has-addons">
                <p className="control">
                  <span className="select">
                    <select id="addGroup" name="addGroup">
                      {
                        this.state.groups.map(g => (
                          <option key={g.id} value={g.id}>{g.title}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control is-expanded">
                  <input id="addTitle" className="input" name="Title" placeholder="タスク名" />
                </p>
              </div>
            </div>
          </div>
          <div className="field is-horizontal">
            <div className="field-label is-normal"></div>
            <div className="field-body">
              <div className="field has-addons">
                <p className="control">
                  <span className="select">
                    <select id="startDay" name="startDay">
                      {
                        Array.from({length:moment(this.state.maxTime).diff(moment(this.state.minTime), 'days')}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>+{v}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="startHour" name="startHour">
                      {
                        Array.from({length:24}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>{v.toString().padStart(2, '0')}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="startMinute" name="startMinute">
                      <option value="0">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="button is-static">〜</span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="endDay" name="endDay">
                      {
                        Array.from({length:moment(this.state.maxTime).diff(moment(this.state.minTime), 'days')}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>+{v}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="endHour" name="endHour">
                      {
                        Array.from({length:24}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>{v.toString().padStart(2, '0')}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="endMinute" name="endMinute">
                      <option value="0">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </span>
                </p>
              </div>
              <div className="field">
                <p className="control">
                  <button className="button is-info" onClick={e => this.addTask(e) }>追加</button>
                </p>
              </div>
            </div>
          </div>
          <div className="field is-horizontal">
            <div className="field-label is-normal">タスク編集：</div>
            <div className="field-body">
              <div className="field has-addons">
                <p className="control is-expanded">
                  <input id="editTitle" className="input" name="editTitle" placeholder="タスク名"
                    value={this.state.selectedItem.title} onChange={e => this.editSelectedItem(e)}
                  />
                </p>
              </div>
            </div>
          </div>
          <div className="field is-horizontal">
            <div className="field-label is-normal"></div>
            <div className="field-body">
              <div className="field has-addons">
                <p className="control">
                  <span className="select">
                    <select id="startDayEdit" name="startDayEdit" onChange={e => this.editSelectedItem(e)}
                      value={moment(this.state.selectedItem.start_time).diff(moment(this.state.minTime), 'days')}
                    >
                      {
                        Array.from({length:moment(this.state.maxTime).diff(moment(this.state.minTime), 'days')}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>+{v}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="startHourEdit" name="startHourEdit" onChange={e => this.editSelectedItem(e)}
                      value={moment(this.state.selectedItem.start_time).hour()}
                    >
                      {
                        Array.from({length:24}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>{v.toString().padStart(2, '0')}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="startMinuteEdit" name="startMinuteEdit" onChange={e => this.editSelectedItem(e)}
                      value={moment(this.state.selectedItem.start_time).hour()}
                    >
                      <option value="0">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="button is-static">〜</span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="endDayEdit" name="endDayEdit" onChange={e => this.editSelectedItem(e)}
                      value={moment(this.state.selectedItem.end_time).diff(moment(this.state.minTime), 'days')}
                    >
                      {
                        Array.from({length:moment(this.state.maxTime).diff(moment(this.state.minTime), 'days')}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>+{v}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="endHourEdit" name="endHourEdit" onChange={e => this.editSelectedItem(e)}
                      value={moment(this.state.selectedItem.end_time).hour()}
                    >
                      {
                        Array.from({length:24}, (v,k)=>k).map(v => (
                          <option key={v} value={v}>{v.toString().padStart(2, '0')}</option>
                        ))
                      }
                    </select>
                  </span>
                </p>
                <p className="control">
                  <span className="select">
                    <select id="endMinuteEdit" name="endMinuteEdit" onChange={e => this.editSelectedItem(e)}
                      value={moment(this.state.selectedItem.end_time).minute()}
                    >
                      <option value="0">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                  </span>
                </p>
              </div>
              <div className="field is-grouped">
                <p className="control">
                  <button className="button is-info" onClick={e => this.editTask(e) }>編集</button>
                </p>
                <p className="control">
                  <button className="button is-danger" onClick={e => this.deleteTask(e) }>削除</button>
                </p>
              <p className="control">
                <button className="button is-info" onClick={e => this.toggleCompleteTask(e) }>完了切替</button>
              </p>
              </div>
            </div>
          </div>
        </div>
        <div className="field is-horizontal">
          <div className="field-label is-normal"></div>
          <div className="field-body">
            <div className="field is-grouped">
              <p className="control">
                <button className="button is-primary" onClick={e => this.import(e) }>読込</button>
                <input name="selectFile" type="file" className="file-input" ref={this._fileInput}
                  onChange={e => this.importing(e)}
                ></input>
              </p>
              <p className="control">
                <button className="button is-primary" onClick={e => this.export(e) }>保存</button>
              </p>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }

  render () {
    const onTimeChange = (visibleTimeStart, visibleTimeEnd, updateScrollCanvas) => {
      // １時間単位の表示になりそうな時、強制的にやめさせる
      if (visibleTimeEnd - visibleTimeStart <= (60 * 60 * 1000)) {
        visibleTimeEnd = visibleTimeStart + (24 * 60 * 60 * 1000)
      }

      const { minTime, maxTime } = this.state
      if (visibleTimeStart < minTime && visibleTimeEnd > maxTime) {
        updateScrollCanvas(minTime, maxTime)
      } else if (visibleTimeStart < minTime) {
        updateScrollCanvas(minTime, minTime + (visibleTimeEnd - visibleTimeStart))
      } else if (visibleTimeEnd > maxTime) {
        updateScrollCanvas(maxTime - (visibleTimeEnd - visibleTimeStart), maxTime)
      } else {
        updateScrollCanvas(visibleTimeStart, visibleTimeEnd)
      }
    }

    const itemRenderer = ({ item, itemContext, getItemProps, getResizeProps }) => {
      const { left: leftResizeProps, right: rightResizeProps } = getResizeProps()
      const { className, ...rest } = getItemProps(item.itemProps)
      return (
        <div title={itemContext.title} className={item.complete ? 'complete ' + className : className} {...rest}>
          {itemContext.useResizeHandle ? <div {...leftResizeProps} /> : ''}

          <div
            className="rct-item-content"
            style={{ maxHeight: `${itemContext.dimensions.height}` }}
          >
            {itemContext.title}
          </div>

          {itemContext.useResizeHandle ? <div {...rightResizeProps} /> : ''}
        </div>
      )
    }

    const itemMove = (itemId, dragTime, newGroupOrder) => {
      const index = this.state.items.findIndex(x => x.id === itemId)
      if (index < 0) return

      const target = this.state.items[index]
      let start_time = Math.max(this.state.minTime, dragTime)
      let end_time = moment(target.end_time).add(start_time - target.start_time.valueOf())
      if (end_time > this.state.maxTime) {
        end_time = this.state.maxTime
        start_time = end_time - (moment(target.end_time).subtract(target.start_time.valueOf()))
      }
      const newItem = { ...target, start_time, end_time }
      this.setState({items: [
        ...this.state.items.slice(0, index),
        newItem,
        ...this.state.items.slice(index + 1)
      ], selectedItem: {...newItem} })
    }

    const itemResize = (itemId, dragTime, edge) => {
      const index = this.state.items.findIndex(x => x.id === itemId)
      if (index < 0) return

      const target = this.state.items[index]
      const time = edge === 'right' ? Math.min(this.state.maxTime, dragTime) : Math.max(this.state.minTime, dragTime)
      const newItem = { ...target, [ edge === 'right' ? 'end_time' : 'start_time']: moment(time) }
      this.setState({items: [
        ...this.state.items.slice(0, index),
        newItem,
        ...this.state.items.slice(index + 1)
      ], selectedItem: {...newItem} })
    }

    const itemSelect = (itemId, e, time) => {
      const item = this.state.items.find(i => i.id === itemId)
      this.setState({ selectedItem: {...item} })
    }

    const canvasClick = (groupId, time, e) => {
      this.setState({ selectedItem: { title: '' } })
    }

    const editArea = this.state.showEditArea ? this.renderEditArea() : null

    return (
      <div id="timeline-app">
        <NotificationSystem ref="notificationSystem" />
        <p className="title is-3 clickable" onClick={e => this.setState({ showEditArea: !this.state.showEditArea }) }>
          <span className="has-icon">編集エリア</span>
          {this.state.showEditArea ? <i className="fas fa-angle-down"></i> : <i className="fas fa-angle-up"></i> }
        </p>
        {editArea}
        <div className="">
          <Timeline
            scrollRef={ref => this._scrollRef = ref}
            groups={this.state.groups}
            items={this.state.items}
            defaultTimeStart={moment(this.state.minTime)}
            defaultTimeEnd={moment(this.state.minTime).add(24, 'hour')}
            stackItems
            onTimeChange={onTimeChange}
            sidebarContent={<div></div>}
            dragSnap={15 * 60 * 1000}
            canMove={true}
            canResize={'both'}
            canChangeGroup={false}
            useResizeHandle={true}
            itemRenderer={itemRenderer}
            onItemMove={itemMove}
            onItemResize={itemResize}
            onItemSelect={itemSelect}
            onCanvasClick={canvasClick}
          >
            <TimelineMarkers>
              <TodayMarker>
                {({ styles, date }) => {
                  styles.backgroundColor = 'red'
                  return (<div style={styles} />)
                }}
              </TodayMarker>
            </TimelineMarkers>
          </Timeline>
        </div>
      </div>
    )
  }
}

export default TimelineApp
